import type { TokenPolicy } from "../../../src/engine/ai/types";
import type { RuleSet } from "../../../src/engine/rules";
import { nextRandom, type RngHolder } from "../../../src/engine/rng";
import type { AiProfile, PersonalityWeights } from "../../../src/engine/types";
import { runRows } from "../aggregate";
import { heading, printTable } from "../format";
import { runSeeds } from "../runner";
import { formatNumber, formatPercent, mean, median, rate } from "../stats";

export const TOKEN_POLICIES: readonly TokenPolicy[] = [
  "immediate",
  "after",
  "finish",
  "after-finish",
  "never",
];

const NEUTRAL_WEIGHTS: PersonalityWeights = { focus: 0, greed: 0, urgency: 0 };

export interface MonteCarloPolicy {
  tokenPolicy: TokenPolicy;
  /** null はゲーム本来のランダムな性格を使う */
  weights: PersonalityWeights | null;
}

export interface MonteCarloOptions {
  days: number;
  players: number;
  rules: RuleSet;
  aiProfile?: AiProfile;
  samples: number;
  seeds: number;
  seed: number;
  /** sampled の重みを全員に適用するか、AIだけに適用するか */
  scope?: "all" | "ai";
  top?: number;
  progress?: boolean;
}

export interface MonteCarloRow extends MonteCarloPolicy {
  label: string;
  median: number;
  mean: number;
  star3: number;
  fail: number;
  debt: number;
  tokens: number;
  completed: number;
}

function policyLabel(policy: MonteCarloPolicy): string {
  if (policy.weights === null) return `${policy.tokenPolicy} roster`;
  if (policy.weights.focus === 0 && policy.weights.greed === 0 && policy.weights.urgency === 0) {
    return `${policy.tokenPolicy} neutral`;
  }
  return `${policy.tokenPolicy} f${policy.weights.focus} g${policy.weights.greed} u${policy.weights.urgency}`;
}

function policyKey(policy: MonteCarloPolicy): string {
  const weights = policy.weights
    ? `${policy.weights.focus}:${policy.weights.greed}:${policy.weights.urgency}`
    : "roster";
  return `${policy.tokenPolicy}:${weights}`;
}

/** -1〜1 を 0.25 刻みでサンプリングする。 */
function sampleWeights(rand: () => number): PersonalityWeights {
  const pick = () => Math.round((rand() * 2 - 1) * 4) / 4;
  return { focus: pick(), greed: pick(), urgency: pick() };
}

export function samplePolicies(samples: number, seed: number): MonteCarloPolicy[] {
  const holder: RngHolder = { rngState: seed >>> 0 };
  const rand = () => nextRandom(holder);
  const policies: MonteCarloPolicy[] = [];
  const seen = new Set<string>();

  // トークン政策の直接比較用に、中立の重みを必ず含める。
  for (const tokenPolicy of TOKEN_POLICIES) {
    const policy = { tokenPolicy, weights: { ...NEUTRAL_WEIGHTS } };
    policies.push(policy);
    seen.add(policyKey(policy));
  }

  let attempts = 0;
  while (policies.length < samples + TOKEN_POLICIES.length && attempts < samples * 20) {
    attempts += 1;
    const tokenPolicy = TOKEN_POLICIES[Math.floor(rand() * TOKEN_POLICIES.length)]!;
    const policy = { tokenPolicy, weights: sampleWeights(rand) };
    const key = policyKey(policy);
    if (seen.has(key)) continue;
    seen.add(key);
    policies.push(policy);
  }
  return policies;
}

function evaluate(
  policy: MonteCarloPolicy,
  options: MonteCarloOptions,
  seeds: number[],
): MonteCarloRow {
  const results = runSeeds(
    {
      days: options.days,
      playerCount: options.players,
      rules: options.rules,
      aiProfile: options.aiProfile,
      weights: policy.weights
        ? options.scope === "ai"
          ? { ai: policy.weights, human: { ...NEUTRAL_WEIGHTS } }
          : { all: policy.weights }
        : undefined,
      bot: { tokenPolicy: policy.tokenPolicy },
    },
    seeds,
  );
  const rows = runRows(results);
  return {
    ...policy,
    label: policyLabel(policy),
    median: median(rows.map((row) => row.finalScore)),
    mean: mean(rows.map((row) => row.finalScore)),
    star3: rate(rows.filter((row) => row.stars === 3).length, rows.length),
    fail: rate(rows.filter((row) => row.failed).length, rows.length),
    debt: median(rows.map((row) => row.debt)),
    tokens: mean(rows.map((row) => row.tokensUsed)),
    completed: mean(rows.map((row) => row.completed)),
  };
}

function rank(rows: MonteCarloRow[]): MonteCarloRow[] {
  return rows.toSorted((a, b) => b.median - a.median || b.mean - a.mean || b.star3 - a.star3);
}

function printRows(rows: MonteCarloRow[], withRank = false): void {
  printTable(
    [...(withRank ? ["rank"] : []), "policy", "median", "mean", "star3", "fail", "debt", "tokens"],
    rows.map((row, index) => [
      ...(withRank ? [String(index + 1)] : []),
      row.label,
      formatNumber(row.median),
      formatNumber(row.mean),
      formatPercent(row.star3),
      formatPercent(row.fail),
      formatNumber(row.debt),
      formatNumber(row.tokens),
    ]),
  );
}

export function printMonteCarlo(options: MonteCarloOptions): MonteCarloRow[] {
  const searchSeeds = Array.from({ length: options.seeds }, (_, index) => index + 1);
  const validationSeeds = Array.from({ length: options.seeds }, (_, index) => 10_000 + index);
  const policies = samplePolicies(options.samples, options.seed);
  const rows: MonteCarloRow[] = [];
  const canonicalRows: MonteCarloRow[] = [];

  // ゲーム本来のランダムな性格で、トークン政策だけを比較する。
  for (const tokenPolicy of TOKEN_POLICIES) {
    canonicalRows.push(evaluate({ tokenPolicy, weights: null }, options, searchSeeds));
  }

  policies.forEach((policy, index) => {
    rows.push(evaluate(policy, options, searchSeeds));
    if (options.progress) console.error(`  montecarlo ${index + 1}/${policies.length}`);
  });

  const ranked = rank(rows);
  const top = options.top ?? 10;
  const candidates = ranked.slice(0, top);
  const validated = rank(candidates.map((policy) => evaluate(policy, options, validationSeeds)));

  heading(
    `montecarlo  ${options.days}日 / ${options.players}人 / ${policies.length} policies x ${searchSeeds.length} seeds / scope=${options.scope ?? "all"} / ai=${options.aiProfile ?? "standard"}`,
  );

  console.log("\n-- token policy (random roster) --");
  printRows(rank(canonicalRows));

  console.log(`\n-- top ${Math.min(top, ranked.length)} (search seeds) --`);
  printRows(candidates, true);

  console.log(`\n-- validation (separate ${validationSeeds.length} seeds) --`);
  printRows(validated, true);

  const best = validated[0] ?? ranked[0];
  if (best) {
    console.log(
      `\nbest: ${best.label} / median ${formatNumber(best.median)} / mean ${formatNumber(best.mean)} / star3 ${formatPercent(best.star3)} / fail ${formatPercent(best.fail)}`,
    );
  }
  console.log(
    "  note: greedy 1-step heuristic. Search and validation use disjoint seeds; sample weights are paired across policies.",
  );
  return validated;
}
