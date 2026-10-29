import { buildResultSummary, dailyTrend } from "../../../src/engine/analytics/result";
import { formatNumber, formatPercent } from "../stats";
import { heading, printTable, subheading } from "../format";
import type { DecisionTrace, RunResult } from "../runner";

function decisionRows(decisions: DecisionTrace[]): string[][] {
  const rows = new Map<
    string,
    { label: string; play: number; pull: number; trash: number; score: number }
  >();
  for (const decision of decisions) {
    const key = decision.playerName;
    const entry = rows.get(key) ?? {
      label: decision.playerName,
      play: 0,
      pull: 0,
      trash: 0,
      score: 0,
    };
    entry[decision.kind] += 1;
    entry.score += decision.score;
    rows.set(key, entry);
  }
  return [...rows.values()].map((entry) => [
    entry.label,
    String(entry.play),
    String(entry.pull),
    String(entry.trash),
    formatNumber(entry.score / Math.max(1, entry.play + entry.pull + entry.trash)),
  ]);
}

function dayActionRows(decisions: DecisionTrace[]): string[][] {
  const rows = new Map<number, { play: number; pull: number; trash: number }>();
  for (const decision of decisions) {
    const entry = rows.get(decision.day) ?? { play: 0, pull: 0, trash: 0 };
    entry[decision.kind] += 1;
    rows.set(decision.day, entry);
  }
  return [...rows.entries()]
    .toSorted((a, b) => a[0] - b[0])
    .map(([day, entry]) => [
      String(day),
      String(entry.play),
      String(entry.pull),
      String(entry.trash),
      String(entry.play + entry.pull + entry.trash),
    ]);
}

export function printTrace(result: RunResult, top = 12): void {
  const state = result.state;
  const summary = buildResultSummary(state);
  heading(`trace  seed=${result.seed} / ${result.days}日 / ${result.playerCount}人`);
  console.log(
    `  scenario=${result.scenario} / final=${summary.score.finalScore} / stars=${summary.score.stars} / failed=${summary.score.failed}`,
  );
  console.log(
    `  score=${summary.score.teamScore} - debt ${summary.score.debtPenalty} - incident ${summary.score.incidentPenalty}`,
  );
  console.log(
    `  completed=${summary.flow.completed} / expired=${summary.flow.expired} / testExpired=${summary.flow.testExpired} / lead=${formatNumber(summary.flow.avgLeadTime)} / WIP=${formatNumber(summary.flow.avgWip)}`,
  );

  subheading("日次推移");
  printTable(
    ["day", "score", "debt", "WIP", "Backlog", "Ready", "InProg", "Review", "done"],
    dailyTrend(state.metrics).map((snapshot) => [
      String(snapshot.day),
      String(snapshot.teamScore),
      String(snapshot.teamDebt),
      formatNumber(snapshot.wip),
      String(snapshot.lanes.open),
      String(snapshot.lanes.inbox),
      String(snapshot.lanes.wip),
      String(snapshot.lanes.test),
      String(snapshot.completed),
    ]),
  );

  subheading("プレイヤー別の行動");
  printTable(["player", "play", "pull", "trash", "avg score"], decisionRows(result.decisions));

  subheading("日ごとの総アクション");
  printTable(["day", "play", "pull", "trash", "total"], dayActionRows(result.decisions));

  subheading("注目タスク");
  const tasks = state.tasks
    .filter((task) => task.lane === "done" || task.lane === "trash")
    .map((task) => ({
      task,
      span:
        task.acquiredDay !== null
          ? `${task.revealedDay}→${task.acquiredDay}`
          : `${task.revealedDay}→切れ`,
    }))
    .toSorted((a, b) => b.task.score - a.task.score)
    .slice(0, top);
  printTable(
    ["task", "lane", "score", "reward", "days"],
    tasks.map(({ task, span }) => [
      task.title,
      task.lane,
      String(task.score),
      task.reward ? `${task.reward.type}${task.reward.level}` : "relic",
      span,
    ]),
  );

  subheading("プレイヤー別の結果");
  printTable(
    ["player", "f/g/u/p/s/a", "completed", "reward", "work", "WIP", "deck(設/開/テ/負)"],
    summary.players.map((player) => [
      player.name,
      player.isHuman
        ? "human"
        : [
            player.weights.focus,
            player.weights.greed,
            player.weights.urgency,
            player.weights.prudence ?? 0,
            player.weights.solidarity ?? 0,
            player.weights.appetite ?? 0,
          ]
            .map((value) => value.toFixed(1))
            .join("/"),
      String(player.completed),
      String(player.score),
      String(
        player.contributed.design.points +
          player.contributed.dev.points +
          player.contributed.test.points,
      ),
      formatNumber(player.avgWip),
      `${player.deck.design}/${player.deck.dev}/${player.deck.test}/${player.deck.debt}`,
    ]),
  );

  subheading("リスク");
  printTable(
    ["card", "drawn", "absorbed", "unmet", "debt"],
    summary.risk.top.map((row) => [
      row.title,
      String(row.drawn),
      String(row.absorbed),
      String(row.unmet),
      String(row.debt),
    ]),
  );
  console.log(
    `  risk draws=${summary.risk.drawn} / absorbed=${formatPercent(summary.risk.absorbedRate)} / debt=${summary.risk.debt}`,
  );
}
