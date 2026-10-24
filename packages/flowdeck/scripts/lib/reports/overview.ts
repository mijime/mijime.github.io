import { distribution, formatNumber, formatPercent, mean, rate } from "../stats";
import { expiredByLane, runRows, seatRows, starCounts, tipStats } from "../aggregate";
import { archetypeById } from "../../../src/engine/analytics/playerTypes";
import {
  heading,
  line,
  printBar,
  printDistribution,
  printHistogram,
  printTable,
  subheading,
} from "../format";
import type { RunResult } from "../runner";

export interface OverviewOptions {
  days: number;
  players: number;
  scenario: string;
  runs: number;
}

function starRates(counts: number[]): number[] {
  const total = Math.max(
    1,
    counts.reduce((sum, count) => sum + count, 0),
  );
  return counts.map((count) => count / total);
}

export function printOverview(results: RunResult[], options: OverviewOptions): void {
  if (results.length === 0) return;
  const rows = runRows(results);
  const scores = rows.map((row) => row.finalScore);
  const debts = rows.map((row) => row.debt);
  const completed = rows.map((row) => row.completed);
  const expired = rows.map((row) => row.expired);
  const wips = rows.map((row) => row.avgWip);
  const leadTimes = rows.map((row) => row.avgLeadTime);
  const riskDebts = rows.map((row) => row.riskDebt);
  const rules = results[0]!.state.rules;
  const counts = starCounts(results);
  const rates = starRates(counts);
  const failed = rows.filter((row) => row.failed).length;
  const debtLimitHits = rows.filter((row) => row.debt >= rules.debtLimit).length;
  const scoreStats = distribution(scores);
  const debtStats = distribution(debts);
  const lanes = expiredByLane(results);

  heading(
    `overview  ${options.scenario} / ${options.days}日 / ${options.players}人 / ${options.runs} seeds`,
  );
  printDistribution("final score", scores);
  printDistribution(
    "team score",
    rows.map((row) => row.teamScore),
  );
  printDistribution("debt", debts);
  printDistribution("completed", completed);
  printDistribution("expired", expired);
  printDistribution(
    "test expired",
    rows.map((row) => row.testExpired),
  );
  printDistribution("avg WIP (team)", wips);
  printDistribution("avg lead time", leadTimes);
  printDistribution("risk debt", riskDebts);
  line("0星（失敗）", `${failed} (${formatPercent(rate(failed, rows.length))})`);
  line(
    "debt limit reached",
    `${debtLimitHits} (${formatPercent(rate(debtLimitHits, rows.length))}) / limit ${rules.debtLimit}`,
  );
  line("avg actions/game", formatNumber(mean(rows.map((row) => row.play + row.pull + row.trash))));
  line(
    "avg tips/game",
    formatNumber(mean(results.map((result) => result.state.outcome?.tips.length ?? 0))),
  );

  subheading("星分布");
  const maxRate = Math.max(...rates);
  for (let stars = 0; stars <= 3; stars += 1) {
    console.log(
      `  ${stars}星 ${String(counts[stars] ?? 0).padStart(5)} (${formatPercent(rates[stars] ?? 0).padStart(6)})`,
    );
    printBar("", counts[stars] ?? 0, Math.max(1, maxRate * rows.length), 24);
  }

  subheading("スコア分布");
  printHistogram(scores);
  console.log(
    `  現在の閾値: 星1 ${rules.starOne} / 星2 ${rules.starTwo} / 星3 ${rules.starThree} / 負債上限 ${rules.debtLimit}`,
  );
  console.log(
    `  推奨値:     星1 ${scoreStats.p25} / 星2 ${scoreStats.p75} / 星3 ${scoreStats.p90} / 負債上限 ${debtStats.p95}（25% / 75% / 90% / 95%）`,
  );

  subheading("フロー");
  const totalExpired = Math.max(
    1,
    expired.reduce((sum, value) => sum + value, 0),
  );
  const laneLabels: { key: keyof typeof lanes; label: string }[] = [
    { key: "open", label: "Backlog" },
    { key: "inbox", label: "Ready" },
    { key: "wip", label: "In Progress" },
    { key: "test", label: "Review" },
  ];
  for (const { key, label } of laneLabels) {
    const count = lanes[key];
    line(
      `期限切れ ${label}`,
      `${formatNumber(count / rows.length, 2)}/game (${formatPercent(count / totalExpired)})`,
    );
  }
  line(
    "期限切れ率",
    formatPercent(
      rate(
        expired.reduce((sum, value) => sum + value, 0),
        rows.reduce((sum, row) => sum + row.completed + row.expired, 0),
      ),
    ),
  );

  subheading("チームの傾向（席順）");
  const seats = seatRows(results);
  printTable(
    ["seat", "n", "獲得", "報酬pt", "作業(設/開/テ)", "WIP"],
    seats.map((seat) => [
      seat.label,
      String(seat.n),
      formatNumber(seat.completed / Math.max(1, seat.n)),
      formatNumber(seat.score / Math.max(1, seat.n)),
      `${formatNumber(seat.design / Math.max(1, seat.n))}/${formatNumber(seat.dev / Math.max(1, seat.n))}/${formatNumber(seat.test / Math.max(1, seat.n))}`,
      formatNumber(seat.wip / Math.max(1, seat.n)),
    ]),
  );

  subheading("プレイヤータイプ");
  const typeCounts = new Map<string, number>();
  for (const result of results) {
    for (const player of result.state.outcome?.perPlayer ?? []) {
      const id = player.archetypeId ?? "balanced";
      typeCounts.set(id, (typeCounts.get(id) ?? 0) + 1);
    }
  }
  const typeTotal = Math.max(
    1,
    [...typeCounts.values()].reduce((sum, count) => sum + count, 0),
  );
  printTable(
    ["type", "count", "share"],
    [...typeCounts.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .map(([id, count]) => [
        archetypeById(id).label,
        String(count),
        formatPercent(count / typeTotal),
      ]),
  );

  const typeStats = new Map<
    string,
    { count: number; work: number; reward: number; completed: number; star3: number }
  >();
  for (const result of results) {
    const star3 = result.state.outcome?.stars === 3 ? 1 : 0;
    for (const player of result.state.outcome?.perPlayer ?? []) {
      const id = player.archetypeId ?? "balanced";
      const entry = typeStats.get(id) ?? { count: 0, work: 0, reward: 0, completed: 0, star3: 0 };
      entry.count += 1;
      entry.work +=
        player.contributed.design.points +
        player.contributed.dev.points +
        player.contributed.test.points;
      entry.reward += player.score;
      entry.completed += player.completed;
      entry.star3 += star3;
      typeStats.set(id, entry);
    }
  }
  subheading("プレイヤータイプと星の関係");
  printTable(
    ["type", "n", "作業pt", "報酬pt", "獲得", "星3率"],
    [...typeStats.entries()]
      .toSorted((a, b) => b[1].star3 / b[1].count - a[1].star3 / a[1].count)
      .map(([id, stat]) => [
        archetypeById(id).label,
        String(stat.count),
        formatNumber(stat.work / Math.max(1, stat.count)),
        formatNumber(stat.reward / Math.max(1, stat.count)),
        formatNumber(stat.completed / Math.max(1, stat.count)),
        formatPercent(stat.star3 / Math.max(1, stat.count)),
      ]),
  );

  subheading("ボードミーティング（指摘の出た割合と星3率）");
  const tips = tipStats(results);
  console.log(`  avg tips=${formatNumber(tips.total / Math.max(1, results.length), 2)}`);
  printTable(
    ["tip", "runs", "rate", "star3率"],
    [...tips.runsWithTip.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .map(([category, count]) => [
        category,
        String(count),
        formatPercent(count / Math.max(1, results.length)),
        formatPercent((tips.star3WithTip.get(category) ?? 0) / Math.max(1, count)),
      ]),
  );
}
