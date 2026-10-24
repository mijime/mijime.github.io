import { RISK_BY_ID } from "../../../src/data/risks";
import { archetypeById } from "../../../src/engine/analytics/playerTypes";
import { formatNumber, formatPercent, pearson, rate } from "../stats";
import { expiredByLane, playerSamples, runRows, starCounts, tipStats } from "../aggregate";
import { heading } from "../format";
import type { RunResult } from "../runner";

export function printInsights(results: RunResult[]): void {
  if (results.length === 0) return;
  const rows = runRows(results);
  const rules = results[0]!.state.rules;
  const counts = starCounts(results);
  const total = Math.max(1, results.length);
  const insights: string[] = [];

  const star3 = (counts[3] ?? 0) / total;
  if (star3 < 0.08) {
    insights.push(
      `星3率が ${formatPercent(star3)}。目標10%に対して厳しめ。星3閾値 ${rules.starThree} か高スコアタスクの報酬を見直す余地がある。`,
    );
  } else if (star3 > 0.14) {
    insights.push(
      `星3率が ${formatPercent(star3)}。目標10%より緩い。星3閾値 ${rules.starThree} を上げてもよい。`,
    );
  }

  const failed = rows.filter((row) => row.failed).length;
  if (failed / total > 0.1) {
    insights.push(
      `0星率 ${formatPercent(rate(failed, total))}。負債上限 ${rules.debtLimit} が厳しいか、リスク吸収が不足している。`,
    );
  }

  const lanes = expiredByLane(results);
  const expiredTotal = Math.max(1, lanes.open + lanes.inbox + lanes.wip + lanes.test);
  const testShare = lanes.test / expiredTotal;
  if (testShare > 0.3) {
    insights.push(
      `期限切れの ${formatPercent(testShare)} がReview。テストカードの供給か、テスト支援の優先度を上げる。`,
    );
  }

  const riskTotals = new Map<string, number>();
  let riskDebt = 0;
  for (const result of results) {
    for (const [id, stat] of Object.entries(result.state.riskStats)) {
      const title = RISK_BY_ID[id]?.title ?? id;
      riskTotals.set(title, (riskTotals.get(title) ?? 0) + stat.debt);
      riskDebt += stat.debt;
    }
  }
  const topRisk = [...riskTotals.entries()].toSorted((a, b) => b[1] - a[1])[0];
  if (topRisk && riskDebt > 0) {
    insights.push(
      `リスク由来負債の ${formatPercent(topRisk[1] / riskDebt)} が「${topRisk[0]}」。余剰作業を作るか、リスクドローを抑える。`,
    );
  }

  const samples = playerSamples(results);
  const axisCorrelations = (["focus", "greed", "urgency"] as const)
    .map((axis) => ({
      axis,
      r: pearson(
        samples.map((sample) => sample.weights[axis]),
        samples.map((sample) => sample.workPoints),
      ),
    }))
    .filter(
      (entry): entry is { axis: "focus" | "greed" | "urgency"; r: number } => entry.r !== null,
    )
    .toSorted((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const strongest = axisCorrelations[0];
  if (strongest && Math.abs(strongest.r) >= 0.15) {
    insights.push(
      `${strongest.axis} と作業ptの相関 r=${strongest.r.toFixed(2)}。性格の影響が比較的強い軸。`,
    );
  }

  const typeStats = new Map<string, { n: number; star3: number }>();
  for (const result of results) {
    const runStar3 = result.state.outcome?.stars === 3 ? 1 : 0;
    for (const player of result.state.outcome?.perPlayer ?? []) {
      const id = player.archetypeId ?? "balanced";
      const entry = typeStats.get(id) ?? { n: 0, star3: 0 };
      entry.n += 1;
      entry.star3 += runStar3;
      typeStats.set(id, entry);
    }
  }
  const eligibleTypes = [...typeStats.entries()]
    .filter(([, stat]) => stat.n >= 30)
    .map(([id, stat]) => ({ id, n: stat.n, rate: stat.star3 / stat.n }))
    .toSorted((a, b) => b.rate - a.rate);
  const bestType = eligibleTypes[0];
  const worstType = eligibleTypes.at(-1);
  if (bestType && worstType) {
    insights.push(
      `星3と相性の良いタイプは「${archetypeById(bestType.id).label}」${formatPercent(bestType.rate)}、苦戦しやすいのは「${archetypeById(worstType.id).label}」${formatPercent(worstType.rate)}。`,
    );
  }

  const tips = tipStats(results);
  const reviewTip = tips.runsWithTip.get("test-expiry") ?? 0;
  if (reviewTip >= 30) {
    const reviewRate = (tips.star3WithTip.get("test-expiry") ?? 0) / reviewTip;
    insights.push(
      `Review期限切れの指摘があるゲームは星3率${formatPercent(reviewRate)}（全体${formatPercent(star3)}）。Review詰まりは星3の主要な阻害要因。`,
    );
  }

  const hygieneTip = tips.runsWithTip.get("hygiene") ?? 0;
  if (hygieneTip >= 30) {
    const hygieneRate = (tips.star3WithTip.get("hygiene") ?? 0) / hygieneTip;
    insights.push(
      `廃棄の指摘があるゲームは星3率${formatPercent(hygieneRate)}。デッキ圧縮と星3には相関がある。`,
    );
  }

  const avgRiskDebt = rows.reduce((sum, row) => sum + row.riskDebt, 0) / total;
  const avgFinalDebt = rows.reduce((sum, row) => sum + row.debt, 0) / total;
  if (avgRiskDebt > 0) {
    insights.push(
      `リスク負債は ${formatNumber(avgRiskDebt, 2)}/game、最終負債は ${formatNumber(avgFinalDebt, 2)}/game。差は廃棄・除去で処理されている。`,
    );
  }

  heading("insights");
  for (const insight of insights.slice(0, 8)) console.log(`  - ${insight}`);
}
