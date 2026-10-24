import type { PersonalityWeights } from "../../../src/engine/types";
import type { RuleSet } from "../../../src/engine/rules";
import { formatNumber, formatPercent, median, rate } from "../stats";
import { runRows } from "../aggregate";
import { heading, printTable } from "../format";
import { runSeeds, type RunResult } from "../runner";

export interface Strategy {
  name: string;
  weights: PersonalityWeights;
}

export const STRATEGIES: Strategy[] = [
  { name: "neutral", weights: { focus: 0, greed: 0, urgency: 0 } },
  { name: "finish", weights: { focus: 1, greed: 0, urgency: 0 } },
  { name: "tidy", weights: { focus: 0, greed: -1, urgency: 0 } },
  { name: "deadline", weights: { focus: 0, greed: 0, urgency: 1 } },
  { name: "finish+tidy", weights: { focus: 1, greed: -1, urgency: 0 } },
  { name: "finish+deadline", weights: { focus: 1, greed: 0, urgency: 1 } },
  { name: "finish+tidy+deadline", weights: { focus: 1, greed: -1, urgency: 1 } },
  { name: "moderate", weights: { focus: 0.5, greed: -0.5, urgency: 0.5 } },
  { name: "score", weights: { focus: 0, greed: 1, urgency: 0 } },
  { name: "score+deadline", weights: { focus: 0, greed: 1, urgency: 1 } },
  { name: "start", weights: { focus: -1, greed: 0, urgency: 0 } },
  { name: "long", weights: { focus: 0, greed: 0, urgency: -1 } },
];

export interface StrategyOptions {
  from: number;
  to: number;
  days: number;
  players: number;
  rules: RuleSet;
  baselineName?: string;
}

export function printStrategies(
  options: StrategyOptions,
  baseline: RunResult[],
  progress = false,
): void {
  const seeds = Array.from(
    { length: options.to - options.from + 1 },
    (_, index) => options.from + index,
  );
  const baselineRows = runRows(baseline);
  const baselineMedian = median(baselineRows.map((row) => row.finalScore));
  const rows: {
    name: string;
    median: number;
    mean: number;
    star3: number;
    fail: number;
    debt: number;
    done: number;
    exp: number;
    delta: number;
  }[] = [
    {
      name: options.baselineName ?? "random(roster)",
      median: baselineMedian,
      mean:
        baselineRows.reduce((sum, row) => sum + row.finalScore, 0) /
        Math.max(1, baselineRows.length),
      star3: rate(baselineRows.filter((row) => row.stars === 3).length, baselineRows.length),
      fail: rate(baselineRows.filter((row) => row.failed).length, baselineRows.length),
      debt: median(baselineRows.map((row) => row.debt)),
      done:
        baselineRows.reduce((sum, row) => sum + row.completed, 0) /
        Math.max(1, baselineRows.length),
      exp:
        baselineRows.reduce((sum, row) => sum + row.expired, 0) / Math.max(1, baselineRows.length),
      delta: 0,
    },
  ];
  const total = STRATEGIES.length;
  STRATEGIES.forEach((strategy, index) => {
    const results = runSeeds(
      {
        days: options.days,
        playerCount: options.players,
        rules: options.rules,
        weights: { all: strategy.weights },
      },
      seeds,
    );
    const strategyRows = runRows(results);
    const strategyMedian = median(strategyRows.map((row) => row.finalScore));
    rows.push({
      name: strategy.name,
      median: strategyMedian,
      mean:
        strategyRows.reduce((sum, row) => sum + row.finalScore, 0) /
        Math.max(1, strategyRows.length),
      star3: rate(strategyRows.filter((row) => row.stars === 3).length, strategyRows.length),
      fail: rate(strategyRows.filter((row) => row.failed).length, strategyRows.length),
      debt: median(strategyRows.map((row) => row.debt)),
      done:
        strategyRows.reduce((sum, row) => sum + row.completed, 0) /
        Math.max(1, strategyRows.length),
      exp:
        strategyRows.reduce((sum, row) => sum + row.expired, 0) / Math.max(1, strategyRows.length),
      delta: strategyMedian - baselineMedian,
    });
    if (progress) console.error(`strategies ${index + 1}/${total}`);
  });

  heading(`strategies  ${options.days}日 / ${options.players}人 / ${seeds.length} seeds`);
  printTable(
    ["policy", "median", "mean", "Δmedian", "star3", "fail", "debt", "done", "exp"],
    rows
      .toSorted((a, b) => b.median - a.median)
      .map((row) => [
        row.name,
        String(row.median),
        formatNumber(row.mean),
        row.delta === 0 ? "-" : `${row.delta > 0 ? "+" : ""}${formatNumber(row.delta)}`,
        formatPercent(row.star3),
        formatPercent(row.fail),
        formatNumber(row.debt),
        formatNumber(row.done),
        formatNumber(row.exp),
      ]),
  );
  console.log("  note: greedy 1-step heuristic. Not a lookahead/optimal solver.");
}
