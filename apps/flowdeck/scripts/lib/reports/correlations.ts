import type { PersonalityWeights } from "../../../src/engine/types";
import { formatNumber, pearson, spearman } from "../stats";
import { playerSamples, seatRows } from "../aggregate";
import { heading, printTable, subheading } from "../format";
import type { RunResult } from "../runner";

const AXES: (keyof PersonalityWeights)[] = ["focus", "greed", "urgency"];

function formatCorrelation(value: number | null): string {
  return value === null ? "-" : value.toFixed(2);
}

export function printCorrelations(results: RunResult[]): void {
  const samples = playerSamples(results);
  heading(`correlations  ${samples.length} player-runs`);

  subheading("性格軸と個人成績（Pearson / Spearman）");
  const rows: string[][] = [];
  for (const axis of AXES) {
    const values = samples.map((sample) => sample.weights[axis]);
    const metrics: { label: string; values: number[] }[] = [
      { label: "報酬pt", values: samples.map((sample) => sample.score) },
      { label: "獲得数", values: samples.map((sample) => sample.completed) },
      { label: "作業pt", values: samples.map((sample) => sample.workPoints) },
      { label: "プレイ枚数", values: samples.map((sample) => sample.workCards) },
      { label: "平均WIP", values: samples.map((sample) => sample.avgWip) },
    ];
    for (const metric of metrics) {
      rows.push([
        axis,
        metric.label,
        formatCorrelation(pearson(values, metric.values)),
        formatCorrelation(spearman(values, metric.values)),
      ]);
    }
  }
  printTable(["axis", "metric", "Pearson", "Spearman"], rows);

  subheading("席順の比較");
  const seats = seatRows(results);
  printTable(
    ["seat", "獲得", "報酬pt", "作業pt", "WIP"],
    seats.map((seat) => [
      seat.label,
      formatNumber(seat.completed / Math.max(1, seat.n)),
      formatNumber(seat.score / Math.max(1, seat.n)),
      formatNumber((seat.design + seat.dev + seat.test) / Math.max(1, seat.n)),
      formatNumber(seat.wip / Math.max(1, seat.n)),
    ]),
  );

  const human = seats.find((seat) => seat.seat === 0);
  const ais = seats.filter((seat) => seat.seat > 0);
  if (human && ais.length > 0) {
    const aiRuns = ais.reduce((sum, seat) => sum + seat.n, 0);
    const aiCompleted = ais.reduce((sum, seat) => sum + seat.completed, 0) / Math.max(1, aiRuns);
    const aiScore = ais.reduce((sum, seat) => sum + seat.score, 0) / Math.max(1, aiRuns);
    console.log(
      `\n  あなた vs AI平均: 獲得 ${formatNumber(human.completed / Math.max(1, human.n))} vs ${formatNumber(aiCompleted)} / 報酬pt ${formatNumber(human.score / Math.max(1, human.n))} vs ${formatNumber(aiScore)}`,
    );
  }
}
