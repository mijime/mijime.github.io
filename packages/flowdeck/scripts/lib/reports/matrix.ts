import { formatNumber, formatPercent, formatSigned, median, rate } from "../stats";
import { runRows } from "../aggregate";
import { heading, printTable } from "../format";
import type { RunResult } from "../runner";

export interface ScenarioResult {
  name: string;
  days: number;
  players: number;
  results: RunResult[];
}

function summarize(results: RunResult[], baselineMedian: number | null) {
  const rows = runRows(results);
  const n = Math.max(1, rows.length);
  const values = rows.map((row) => row.finalScore);
  const valueMedian = median(values);
  return {
    n: rows.length,
    median: valueMedian,
    mean: values.reduce((sum, value) => sum + value, 0) / n,
    delta: baselineMedian === null ? 0 : valueMedian - baselineMedian,
    star3: rate(rows.filter((row) => row.stars === 3).length, n),
    fail: rate(rows.filter((row) => row.failed).length, n),
    debt: median(rows.map((row) => row.debt)),
    completed: rows.reduce((sum, row) => sum + row.completed, 0) / n,
    expired: rows.reduce((sum, row) => sum + row.expired, 0) / n,
    riskDebt: rows.reduce((sum, row) => sum + row.riskDebt, 0) / n,
  };
}

export function printScenarioTable(title: string, scenarios: ScenarioResult[]): void {
  const visible = scenarios.filter((scenario) => scenario.results.length > 0);
  if (visible.length === 0) return;
  const summaries = visible.map((scenario) => ({
    ...scenario,
    stats: summarize(scenario.results, null),
  }));
  const baseline = summaries[0]?.stats.median ?? null;
  const rows = summaries.map((entry, index) => {
    const stats = { ...entry.stats, delta: baseline === null ? 0 : entry.stats.median - baseline };
    return [
      entry.name,
      String(entry.days),
      String(entry.players),
      String(stats.median),
      index === 0 ? "-" : formatSigned(stats.delta),
      formatNumber(stats.mean),
      formatPercent(stats.star3),
      formatPercent(stats.fail),
      formatNumber(stats.debt),
      formatNumber(stats.completed),
      formatNumber(stats.expired),
      formatNumber(stats.riskDebt, 2),
    ];
  });

  heading(`${title}  ${visible.length} conditions`);
  printTable(
    [
      "condition",
      "days",
      "players",
      "median",
      "Δmedian",
      "mean",
      "star3",
      "fail",
      "debt",
      "done",
      "exp",
      "riskDebt",
    ],
    rows,
  );
  const best = summaries.toSorted((a, b) => b.stats.median - a.stats.median)[0];
  if (best) {
    console.log(
      `  best median: ${best.name} (${best.stats.median}) / best star3: ${
        summaries.toSorted((a, b) => b.stats.star3 - a.stats.star3)[0]?.name ?? "-"
      }`,
    );
  }
}
