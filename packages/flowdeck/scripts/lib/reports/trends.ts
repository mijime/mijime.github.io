import type { DaySnapshot } from "../../../src/engine/types";
import { dailyTrend } from "../../../src/engine/analytics/result";
import { formatNumber, mean } from "../stats";
import { heading, printTable, subheading } from "../format";
import type { RunResult } from "../runner";

function averageSnapshots(results: RunResult[], day: number): DaySnapshot | null {
  const snapshots = results
    .map((result) => dailyTrend(result.state.metrics).find((snapshot) => snapshot.day === day))
    .filter((snapshot): snapshot is DaySnapshot => snapshot !== undefined);
  if (snapshots.length === 0) return null;
  const averaged: DaySnapshot = {
    day,
    teamScore: mean(snapshots.map((snapshot) => snapshot.teamScore)),
    teamDebt: mean(snapshots.map((snapshot) => snapshot.teamDebt)),
    open: mean(snapshots.map((snapshot) => snapshot.open)),
    wip: mean(snapshots.map((snapshot) => snapshot.wip)),
    completed: mean(snapshots.map((snapshot) => snapshot.completed)),
    lanes: {
      open: mean(snapshots.map((snapshot) => snapshot.lanes.open)),
      inbox: mean(snapshots.map((snapshot) => snapshot.lanes.inbox)),
      wip: mean(snapshots.map((snapshot) => snapshot.lanes.wip)),
      test: mean(snapshots.map((snapshot) => snapshot.lanes.test)),
      done: mean(snapshots.map((snapshot) => snapshot.lanes.done)),
    },
    perPlayer: [],
  };
  return averaged;
}

export function printTrends(results: RunResult[], days: number): void {
  heading(`trends  ${days}日 / ${results.length} seeds`);
  const rows: string[][] = [];
  let previousCompleted = 0;
  for (let day = 1; day <= days; day += 1) {
    const snapshot = averageSnapshots(results, day);
    if (!snapshot) continue;
    const perDay = Math.max(0, snapshot.completed - previousCompleted);
    previousCompleted = snapshot.completed;
    rows.push([
      String(day),
      formatNumber(snapshot.teamScore),
      formatNumber(snapshot.teamDebt, 2),
      formatNumber(snapshot.wip, 2),
      formatNumber(snapshot.open, 2),
      formatNumber(snapshot.lanes.inbox, 2),
      formatNumber(snapshot.lanes.wip, 2),
      formatNumber(snapshot.lanes.test, 2),
      formatNumber(snapshot.completed, 2),
      formatNumber(perDay, 2),
    ]);
  }
  printTable(
    ["day", "score", "debt", "WIP", "Backlog", "Ready", "InProg", "Review", "done", "done/day"],
    rows,
  );

  subheading("レーン滞留の平均シェア");
  const totals = { inbox: 0, wip: 0, test: 0 };
  for (const result of results) {
    for (const snapshot of dailyTrend(result.state.metrics)) {
      totals.inbox += snapshot.lanes.inbox;
      totals.wip += snapshot.lanes.wip;
      totals.test += snapshot.lanes.test;
    }
  }
  const total = Math.max(1, totals.inbox + totals.wip + totals.test);
  console.log(
    `  Ready ${((totals.inbox / total) * 100).toFixed(1)}% / In Progress ${((totals.wip / total) * 100).toFixed(1)}% / Review ${((totals.test / total) * 100).toFixed(1)}%`,
  );
}
