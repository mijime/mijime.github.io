import { bootstrapDifference, formatNumber, formatPercent, formatSigned, rate } from "../stats";
import { runRows } from "../aggregate";
import { heading, printTable } from "../format";
import type { RunResult } from "../runner";

interface NamedResults {
  name: string;
  results: RunResult[];
}

function metricRows(results: RunResult[]) {
  const rows = runRows(results);
  return { rows, n: Math.max(1, rows.length) };
}

export function printCompare(left: NamedResults, right: NamedResults): void {
  const a = metricRows(left.results);
  const b = metricRows(right.results);
  heading(`compare  ${left.name} vs ${right.name}  (${a.rows.length} / ${b.rows.length} seeds)`);

  const metrics: {
    label: string;
    a: number[];
    b: number[];
    format: (value: number) => string;
  }[] = [
    {
      label: "final score (mean)",
      a: a.rows.map((row) => row.finalScore),
      b: b.rows.map((row) => row.finalScore),
      format: (value) => formatNumber(value),
    },
    {
      label: "team score (mean)",
      a: a.rows.map((row) => row.teamScore),
      b: b.rows.map((row) => row.teamScore),
      format: (value) => formatNumber(value),
    },
    {
      label: "debt (mean)",
      a: a.rows.map((row) => row.debt),
      b: b.rows.map((row) => row.debt),
      format: (value) => formatNumber(value),
    },
    {
      label: "completed (mean)",
      a: a.rows.map((row) => row.completed),
      b: b.rows.map((row) => row.completed),
      format: (value) => formatNumber(value),
    },
    {
      label: "expired (mean)",
      a: a.rows.map((row) => row.expired),
      b: b.rows.map((row) => row.expired),
      format: (value) => formatNumber(value),
    },
    {
      label: "star3 rate",
      a: a.rows.map((row) => (row.stars === 3 ? 1 : 0)),
      b: b.rows.map((row) => (row.stars === 3 ? 1 : 0)),
      format: (value) => formatPercent(value),
    },
    {
      label: "fail rate",
      a: a.rows.map((row) => (row.failed ? 1 : 0)),
      b: b.rows.map((row) => (row.failed ? 1 : 0)),
      format: (value) => formatPercent(value),
    },
    {
      label: "risk debt (mean)",
      a: a.rows.map((row) => row.riskDebt),
      b: b.rows.map((row) => row.riskDebt),
      format: (value) => formatNumber(value, 2),
    },
  ];

  printTable(
    ["metric", left.name, right.name, "delta", "95% CI", "win?"],
    metrics.map((metric, index) => {
      const difference = bootstrapDifference(metric.a, metric.b, undefined, 400, 17 + index);
      return [
        metric.label,
        metric.format(difference.left),
        metric.format(difference.right),
        formatSigned(difference.delta, metric.label.includes("rate") ? 3 : 2),
        `${formatSigned(difference.low, metric.label.includes("rate") ? 3 : 2)}..${formatSigned(difference.high, metric.label.includes("rate") ? 3 : 2)}`,
        difference.low > 0 ? "↑" : difference.high < 0 ? "↓" : "—",
      ];
    }),
  );
  console.log(
    `  ${left.name}: star3 ${formatPercent(rate(a.rows.filter((row) => row.stars === 3).length, a.n))}, fail ${formatPercent(rate(a.rows.filter((row) => row.failed).length, a.n))}`,
  );
  console.log(
    `  ${right.name}: star3 ${formatPercent(rate(b.rows.filter((row) => row.stars === 3).length, b.n))}, fail ${formatPercent(rate(b.rows.filter((row) => row.failed).length, b.n))}`,
  );
}
