import type { AiProfile, PersonalityWeights } from "../../src/engine/types";
import { GAME_LENGTH_OPTIONS, TOTAL_DAYS } from "../../src/engine/rules/balance";
import { OVERRIDE_KEYS, scenarioIds, type OverrideKey } from "./scenarios";
import { MAX_GENERATION_SWING } from "../../src/engine/rules/generation";
import type { WeightsConfig } from "./runner";

export type OutputFormat = "text" | "json" | "csv";

export interface SimOptions {
  runs: number;
  from: number;
  to: number;
  seed: number | null;
  days: number;
  players: number;
  aiProfile: AiProfile;
  ruleset: string;
  scenario: string;
  strategies: boolean;
  tasks: boolean;
  ai: boolean;
  risks: boolean;
  trends: boolean;
  correlations: boolean;
  insights: boolean;
  overview: boolean;
  all: boolean;
  matrix: { days: number[]; players: number[] } | null;
  scenarios: string[] | null;
  sweep: { key: OverrideKey; values: (string | number | boolean)[] } | null;
  compare: [string, string] | null;
  trace: number | null;
  format: OutputFormat;
  out: string | null;
  progress: boolean;
  benchmark: boolean;
  montecarlo: boolean;
  samples: number;
  mcSeeds: number;
  mcSeed: number;
  mcScope: "all" | "ai";
  top: number;
  weights: WeightsConfig | null;
  help: boolean;
}

const DAY_OPTIONS = new Set<number>(GAME_LENGTH_OPTIONS);
const PLAYER_OPTIONS = new Set([4, 5, 6]);

function get(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

const WEIGHT_KEYS = ["focus", "greed", "urgency", "prudence", "solidarity", "appetite"] as const;

type WeightKey = (typeof WEIGHT_KEYS)[number];

function isWeightKey(value: string | undefined): value is WeightKey {
  return value !== undefined && (WEIGHT_KEYS as readonly string[]).includes(value);
}

function parseWeights(value: string | undefined): PersonalityWeights | null {
  if (!value) return null;
  const weights: PersonalityWeights = { focus: 0, greed: 0, urgency: 0 };
  for (const part of value.split(",")) {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.trim();
    const parsed = Number(rawValue);
    if (!isWeightKey(key)) {
      throw new Error(`unknown weight: ${key} (allowed: ${WEIGHT_KEYS.join(", ")})`);
    }
    if (!Number.isFinite(parsed)) throw new Error(`invalid weight value: ${part}`);
    weights[key] = parsed;
  }
  return weights;
}

function parseList(value: string | undefined): string[] | null {
  if (!value) return null;
  const list = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return list.length > 0 ? list : null;
}

function parseNumberList(value: string, label: string): number[] {
  const values = value.split(",").map((entry) => Number(entry.trim()));
  if (values.some((entry) => !Number.isFinite(entry))) {
    throw new Error(`${label} must be a comma-separated number list: ${value}`);
  }
  return values;
}

function getMatrixSpec(argv: string[]): string | undefined {
  const index = argv.indexOf("--matrix");
  if (index < 0) return undefined;
  const parts: string[] = [];
  for (let cursor = index + 1; cursor < argv.length; cursor += 1) {
    const value = argv[cursor];
    if (!value || value.startsWith("--")) break;
    parts.push(value);
    if (parts.length >= 2) break;
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function parseMatrix(value: string | undefined): SimOptions["matrix"] {
  if (!value) return null;
  const days: number[] = [];
  const players: number[] = [];
  for (const part of value.split(/\s+/)) {
    const [key, rawValues] = part.split("=");
    if (!rawValues) throw new Error(`matrix must be days=... or players=...: ${part}`);
    const values = parseNumberList(rawValues, key ?? "matrix");
    if (key === "days") days.push(...values);
    else if (key === "players") players.push(...values);
    else throw new Error(`unknown matrix dimension: ${key}`);
  }
  if (days.length === 0 && players.length === 0) {
    throw new Error("matrix needs days=... or players=...");
  }
  return {
    days: days.length > 0 ? [...new Set(days)] : [TOTAL_DAYS],
    players: players.length > 0 ? [...new Set(players)] : [5],
  };
}

function parseSweep(value: string | undefined): SimOptions["sweep"] {
  if (!value) return null;
  const separator = value.indexOf("=");
  if (separator < 0) throw new Error(`sweep must be key=v1,v2,...: ${value}`);
  const keyPart = value
    .slice(0, separator)
    .trim()
    .replace(/^balance\./, "");
  const values = value
    .slice(separator + 1)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (values.length === 0) throw new Error(`sweep has no values: ${value}`);
  const key = OVERRIDE_KEYS.find((candidate) => candidate === keyPart);
  if (!key) throw new Error(`unknown sweep key: ${keyPart} (allowed: ${OVERRIDE_KEYS.join(", ")})`);
  const parsed = values.map((entry) => {
    if (key === "allowSubstitution") {
      if (entry !== "true" && entry !== "false") throw new Error(`invalid boolean: ${entry}`);
      return entry === "true";
    }
    if (key === "generation") {
      if (entry !== "budget" && entry !== "value" && entry !== "auto") {
        throw new Error(`invalid generation policy: ${entry}`);
      }
      return entry;
    }
    const number = Number(entry);
    if (!Number.isFinite(number) || number < 0) throw new Error(`invalid number: ${entry}`);
    if (key === "generationSwing" && number > MAX_GENERATION_SWING) {
      throw new Error(`generationSwing must be between 0 and ${MAX_GENERATION_SWING}: ${number}`);
    }
    return number;
  });
  return { key, values: parsed };
}

function parseCompare(value: string | undefined): SimOptions["compare"] {
  if (!value) return null;
  const ids = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (ids.length !== 2) throw new Error(`compare needs exactly two scenario ids: ${value}`);
  return [ids[0]!, ids[1]!];
}

export function parseArgs(argv: string[]): SimOptions {
  const runs = Math.max(1, int(get(argv, "runs"), 300));
  const from = Math.max(1, int(get(argv, "from"), 1));
  const to = Math.max(from, int(get(argv, "to"), from + runs - 1));
  const seedValue = get(argv, "seed");
  const seed =
    seedValue !== undefined && Number.isFinite(Number(seedValue)) ? Number(seedValue) : null;
  const days = int(get(argv, "days"), TOTAL_DAYS);
  const players = int(get(argv, "players"), 5);
  const aiProfileValue = get(argv, "ai-profile") ?? "standard";
  if (aiProfileValue !== "standard") {
    throw new Error(`--ai-profile is fixed to standard: ${aiProfileValue}`);
  }
  if (!DAY_OPTIONS.has(days)) {
    throw new Error(`--days must be one of ${[...DAY_OPTIONS].join(", ")}: ${days}`);
  }
  if (!PLAYER_OPTIONS.has(players)) {
    throw new Error(`--players must be one of ${[...PLAYER_OPTIONS].join(", ")}: ${players}`);
  }
  const formatValue = (
    get(argv, "format") ??
    (argv.includes("--csv") ? "csv" : argv.includes("--json") ? "json" : "text")
  ).toLowerCase();
  if (formatValue !== "text" && formatValue !== "json" && formatValue !== "csv") {
    throw new Error(`--format must be text, json, or csv: ${formatValue}`);
  }
  const scenario = get(argv, "scenario") ?? "base";
  if (!scenarioIds().includes(scenario)) {
    throw new Error(`unknown scenario: ${scenario} (allowed: ${scenarioIds().join(", ")})`);
  }
  const matrix = parseMatrix(getMatrixSpec(argv));
  for (const value of matrix?.days ?? []) {
    if (!DAY_OPTIONS.has(value))
      throw new Error(`--matrix days must be one of ${[...DAY_OPTIONS].join(", ")}: ${value}`);
  }
  for (const value of matrix?.players ?? []) {
    if (!PLAYER_OPTIONS.has(value))
      throw new Error(`--matrix players must be 4, 5, or 6: ${value}`);
  }
  const scenarios = parseList(get(argv, "scenarios"));
  for (const id of scenarios ?? []) {
    if (!scenarioIds().includes(id)) throw new Error(`unknown scenario: ${id}`);
  }
  const all = argv.includes("--all");
  const weightsAll = parseWeights(get(argv, "weights"));
  const weightsHuman = parseWeights(get(argv, "human-weights"));
  const weightsAi = parseWeights(get(argv, "ai-weights"));
  const weights: WeightsConfig | null =
    weightsAll || weightsHuman || weightsAi
      ? {
          all: weightsAll ?? undefined,
          human: weightsHuman ?? undefined,
          ai: weightsAi ?? undefined,
        }
      : null;

  return {
    runs: to - from + 1,
    from,
    to,
    seed,
    days,
    players,
    aiProfile: aiProfileValue as AiProfile,
    ruleset: get(argv, "ruleset") ?? "base",
    scenario,
    strategies: argv.includes("--strategies"),
    tasks: argv.includes("--tasks"),
    ai: argv.includes("--ai"),
    risks: argv.includes("--risks"),
    trends: argv.includes("--trends"),
    correlations: argv.includes("--correlations"),
    insights: argv.includes("--insights"),
    overview:
      !argv.includes("--strategies") &&
      !argv.includes("--tasks") &&
      !argv.includes("--ai") &&
      !argv.includes("--risks") &&
      !argv.includes("--trends") &&
      !argv.includes("--correlations") &&
      !argv.includes("--insights") &&
      !matrix &&
      !scenarios &&
      !get(argv, "sweep") &&
      !parseCompare(get(argv, "compare")),
    all,
    matrix,
    scenarios,
    sweep: parseSweep(get(argv, "sweep")),
    compare: parseCompare(get(argv, "compare")),
    trace: get(argv, "trace") === undefined ? null : int(get(argv, "trace"), 1),
    format: formatValue,
    out: get(argv, "out") ?? null,
    progress: argv.includes("--progress"),
    benchmark: argv.includes("--benchmark"),
    montecarlo: argv.includes("--montecarlo") || argv.includes("--mc"),
    samples: Math.max(0, int(get(argv, "samples"), 32)),
    mcSeeds: Math.max(1, int(get(argv, "mc-seeds"), 24)),
    mcSeed: Math.max(1, int(get(argv, "mc-seed"), 1)),
    mcScope: get(argv, "mc-scope") === "ai" ? "ai" : "all",
    top: Math.max(1, int(get(argv, "top"), 10)),
    weights,
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

export function printHelp(): void {
  console.log(`Flowdeck balance simulation

Usage:
  pnpm --filter @mijime/flowdeck sim
  pnpm --filter @mijime/flowdeck sim -- --runs 1000
  pnpm --filter @mijime/flowdeck sim -- --seed 42
  pnpm --filter @mijime/flowdeck sim -- --all
  pnpm --filter @mijime/flowdeck sim -- --trends
  pnpm --filter @mijime/flowdeck sim -- --correlations
  pnpm --filter @mijime/flowdeck sim -- --strategies
  pnpm --filter @mijime/flowdeck sim -- --montecarlo --samples 32 --mc-seeds 24
  pnpm --filter @mijime/flowdeck sim -- --tasks
  pnpm --filter @mijime/flowdeck sim -- --ai
  pnpm --filter @mijime/flowdeck sim -- --risks
  pnpm --filter @mijime/flowdeck sim -- --matrix days=10,20,30 players=4,5,6
  pnpm --filter @mijime/flowdeck sim -- --scenarios base,substitution,no-tokens
  pnpm --filter @mijime/flowdeck sim -- --sweep balance.startingTokens=0,1,2
  pnpm --filter @mijime/flowdeck sim -- --compare base,substitution
  pnpm --filter @mijime/flowdeck sim -- --trace 42
  pnpm --filter @mijime/flowdeck sim -- --runs 1000 --format csv --out runs.csv

Options:
  --runs <n>          number of seeds (default: 300)
  --from <n>          first seed (default: 1)
  --to <n>            last seed (default: from + runs - 1)
  --seed <n>          run one seed and print details
  --days <n>          ${GAME_LENGTH_OPTIONS.join(" | ")} (default: 10)
  --players <n>       4 | 5 | 6 (default: 5)
  --ai-profile <s>    standard (default: standard, fixed)
  --ruleset <id>      base (default: base)
  --scenario <id>     ${scenarioIds().join(", ")}
  --weights <spec>    focus,greed,urgency,prudence,solidarity,appetite
  --human-weights     weights for the human seat only
  --ai-weights        weights for AI seats only
  --matrix <spec>     days=10,20 players=4,5,6
  --scenarios <ids>   compare scenario presets
  --sweep <spec>      e.g. balance.startingTokens=0,1,2
  --compare <a,b>     compare two scenarios (or two override specs)
  --trends            daily average trends
  --correlations      personality, seat, and human/AI correlations
  --insights          data-driven balance observations
  --strategies        compare fixed personality policies
  --montecarlo, --mc  Monte Carlo search over token timing and weights
  --samples <n>       random policies to sample for --mc (default: 32)
  --mc-seeds <n>      seeds per policy for --mc (default: 24)
  --mc-seed <n>       random seed for policy sampling (default: 1)
  --mc-scope <s>      all | ai (default: all; ai keeps the human neutral)
  --top <n>           show top N policies (default: 10)
  --tasks             task pool and completion breakdown
  --ai                AI action mix
  --risks             risk-card debt breakdown
  --all               run every report section
  --trace <seed>      print one seed's daily trace
  --format <fmt>      text | json | csv (default: text)
  --out <path>        write JSON/CSV output to a file
  --progress          print progress while running many seeds
  --benchmark         write benchmark data (use with --out)
  --help              show this help`);
}
