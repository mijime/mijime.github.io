import process from "node:process";
import { generateTaskDefs } from "../src/data/generateTasks";
import { GENERATION_POLICIES } from "../src/data/generationPolicies";
import { taskEfficiency, taskValue, totalRequirements } from "../src/data/generationMath";
import { DEFAULT_GENERATION_SWING, normalizeGenerationSwing } from "../src/engine/rules/generation";
import type { GameState, TaskDef } from "../src/engine/types";
import { writeOutput } from "./lib/io";
import { quantile } from "./lib/stats";

interface Options {
  runs: number;
  seed: number | null;
  policy: keyof typeof GENERATION_POLICIES;
  compare: boolean;
  swing: number;
  format: "text" | "json";
  out: string | null;
}

interface Row {
  def: TaskDef;
  archetype: "normal" | "effect" | "incident";
  value: number;
  total: number;
  efficiency: number;
}

function parseArgs(argv: string[]): Options {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const runs = Number(get("runs") ?? "200");
  const seed = get("seed");
  const policy = get("policy") ?? "auto";
  const formatValue = (get("format") ?? "text").toLowerCase();
  const swingValue = Number(get("swing") ?? String(DEFAULT_GENERATION_SWING));
  return {
    runs: Number.isFinite(runs) && runs > 0 ? Math.floor(runs) : 200,
    seed: seed !== undefined && Number.isFinite(Number(seed)) ? Number(seed) : null,
    policy: policy === "value" ? "value" : policy === "auto" ? "auto" : "budget",
    compare: argv.includes("--compare"),
    swing: normalizeGenerationSwing(swingValue),
    format: formatValue === "json" ? "json" : "text",
    out: get("out") ?? null,
  };
}

function archetypeOf(def: TaskDef): Row["archetype"] {
  if (def.kind === "incident") return "incident";
  return def.reward.effect ? "effect" : "normal";
}

function generate(seed: number, policy: keyof typeof GENERATION_POLICIES, swing: number): Row[] {
  const state = { seed, rngState: seed >>> 0 } as GameState;
  return generateTaskDefs(state, { ...GENERATION_POLICIES[policy], swing }).map((def) => ({
    def,
    archetype: archetypeOf(def),
    value: taskValue(def),
    total: totalRequirements(def.requirements),
    efficiency: taskEfficiency(def),
  }));
}

function summarize(rows: Row[]) {
  const efficiencies = rows.map((row) => row.efficiency).toSorted((a, b) => a - b);
  const totals = rows.map((row) => row.total).toSorted((a, b) => a - b);
  return {
    count: rows.length,
    efficiency: {
      min: efficiencies[0] ?? 0,
      p10: quantile(efficiencies, 0.1),
      p25: quantile(efficiencies, 0.25),
      median: quantile(efficiencies, 0.5),
      p75: quantile(efficiencies, 0.75),
      p90: quantile(efficiencies, 0.9),
      max: efficiencies.at(-1) ?? 0,
    },
    total: {
      min: totals[0] ?? 0,
      p25: quantile(totals, 0.25),
      median: quantile(totals, 0.5),
      p75: quantile(totals, 0.75),
      max: totals.at(-1) ?? 0,
    },
    tooCheap: rows.filter((row) => row.efficiency > 0.45).length,
    tooExpensive: rows.filter((row) => row.efficiency < 0.25).length,
  };
}

function counts<T>(rows: Row[], key: (row: Row) => T): Map<T, number> {
  const map = new Map<T, number>();
  for (const row of rows) map.set(key(row), (map.get(key(row)) ?? 0) + 1);
  return map;
}

function printDistribution(label: string, rows: Row[]) {
  const stats = summarize(rows);
  const fmt = (value: number) => value.toFixed(3);
  console.log(
    `  ${label.padEnd(10)} n=${stats.count} total=${stats.total.min}-${stats.total.max} eff min=${fmt(stats.efficiency.min)} p25=${fmt(stats.efficiency.p25)} median=${fmt(stats.efficiency.median)} p75=${fmt(stats.efficiency.p75)} max=${fmt(stats.efficiency.max)}`,
  );
}

function printSummary(policy: keyof typeof GENERATION_POLICIES, rows: Row[], swing: number) {
  const stats = summarize(rows);
  console.log(
    `\n[${policy}] runs=${rows.length / 72} tasks=${stats.count} swing=${swing} efficiency min=${stats.efficiency.min.toFixed(3)} p10=${stats.efficiency.p10.toFixed(3)} median=${stats.efficiency.median.toFixed(3)} p90=${stats.efficiency.p90.toFixed(3)} max=${stats.efficiency.max.toFixed(3)}`,
  );
  console.log(
    `  outliers: too-cheap(>0.45)=${stats.tooCheap} (${((stats.tooCheap / stats.count) * 100).toFixed(1)}%) too-expensive(<0.25)=${stats.tooExpensive} (${((stats.tooExpensive / stats.count) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  total: min=${stats.total.min} p25=${stats.total.p25} median=${stats.total.median} p75=${stats.total.p75} max=${stats.total.max}`,
  );
  console.log(
    `  archetype: ${[...counts(rows, (row) => row.archetype)].map(([k, v]) => `${k}=${v}`).join(" ")}`,
  );
  console.log(
    `  score: ${[...counts(rows, (row) => row.def.score)]
      .toSorted((a, b) => a[0] - b[0])
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")}`,
  );
  console.log(
    `  effect: ${[
      ...counts(
        rows.filter((row) => row.def.reward.effect),
        (row) => row.def.reward.effect?.kind ?? "none",
      ),
    ]
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")}`,
  );
  console.log(
    `  theme: ${[...counts(rows, (row) => row.def.theme ?? "-")]
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")}`,
  );
  console.log(
    `  unique titles: ${new Set(rows.map((row) => row.def.title)).size} / ${rows.length}`,
  );
  for (const archetype of ["normal", "effect", "incident"] as const) {
    printDistribution(
      archetype,
      rows.filter((row) => row.archetype === archetype),
    );
  }
  for (const score of [1, 2, 3, 6, 7]) {
    const subset = rows.filter((row) => row.archetype === "normal" && row.def.score === score);
    if (subset.length > 0) printDistribution(`normal s${score}`, subset);
  }
}

function printSeed(seed: number, policy: keyof typeof GENERATION_POLICIES, swing: number) {
  const rows = generate(seed, policy, swing).toSorted((a, b) => b.efficiency - a.efficiency);
  console.log(`\n[${policy}] seed=${seed} swing=${swing}`);
  for (const row of rows) {
    const effect = row.def.reward.effect ? ` effect=${row.def.reward.effect.kind}` : "";
    const penalty = row.def.penalty ? ` penalty=${row.def.penalty.kind}` : "";
    console.log(
      `  ${row.efficiency.toFixed(3)} ${row.archetype.padEnd(8)} score=${row.def.score} reward=${row.def.reward.type}${row.def.reward.level}${effect}${penalty} req=${row.def.requirements.design}/${row.def.requirements.dev}/${row.def.requirements.test} total=${row.total} value=${row.value.toFixed(1)} ${row.def.title}`,
    );
  }
}

function printCompare(runs: number, swing: number) {
  const rows = Object.fromEntries(
    Object.keys(GENERATION_POLICIES).map((policy) => {
      const key = policy as keyof typeof GENERATION_POLICIES;
      const all: Row[] = [];
      for (let seed = 1; seed <= runs; seed += 1) all.push(...generate(seed, key, swing));
      return [key, summarize(all)];
    }),
  ) as Record<keyof typeof GENERATION_POLICIES, ReturnType<typeof summarize>>;
  console.log(`\n[compare] runs=${runs} swing=${swing}`);
  console.log("  metric                 budget    value     auto");
  for (const key of ["min", "p10", "median", "p90", "max"] as const) {
    console.log(
      `  efficiency ${key.padEnd(8)} ${rows.budget.efficiency[key].toFixed(3)}     ${rows.value.efficiency[key].toFixed(3)}     ${rows.auto.efficiency[key].toFixed(3)}`,
    );
  }
  console.log(
    `  too-cheap (>0.45)      ${rows.budget.tooCheap.toString().padEnd(9)} ${rows.value.tooCheap.toString().padEnd(9)} ${rows.auto.tooCheap}`,
  );
  console.log(
    `  too-expensive (<0.25)  ${rows.budget.tooExpensive.toString().padEnd(9)} ${rows.value.tooExpensive.toString().padEnd(9)} ${rows.auto.tooExpensive}`,
  );
  console.log(
    `  total median           ${rows.budget.total.median.toString().padEnd(9)} ${rows.value.total.median.toString().padEnd(9)} ${rows.auto.total.median}`,
  );
}

function printHelp() {
  console.log(`Flowdeck task generation simulation

Usage:
  pnpm --filter @mijime/flowdeck tasks
  pnpm --filter @mijime/flowdeck tasks -- --policy value --runs 500
  pnpm --filter @mijime/flowdeck tasks -- --policy auto --runs 500
  pnpm --filter @mijime/flowdeck tasks -- --compare
  pnpm --filter @mijime/flowdeck tasks -- --seed 42 --policy auto

Options:
  --runs <n>        number of seeds (default: 200)
  --policy <id>     budget | value | auto (default: auto)
  --swing <n>       task generation swing 0..0.2 (default: 0.1)
  --compare         compare budget and value efficiency distributions
  --seed <n>        print generated tasks for one seed
  --format <fmt>    text | json (default: text)
  --out <path>      write JSON output to a file
  --help            show this help

Efficiency = value / requirement total.
value = score + reward.level * 0.5 + effect value + penalty value

Outliers:
  > 0.45  too cheap (strong value for low requirements)
  < 0.25  too expensive (weak value for high requirements)`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }
  if (options.compare) {
    printCompare(options.runs, options.swing);
    return;
  }
  if (options.seed !== null) {
    if (options.format === "json") {
      const rows = generate(options.seed, options.policy, options.swing);
      writeOutput(
        JSON.stringify(
          {
            policy: options.policy,
            seed: options.seed,
            swing: options.swing,
            tasks: rows.map((row) =>
              Object.assign({}, row.def, {
                archetype: row.archetype,
                value: row.value,
                total: row.total,
                efficiency: row.efficiency,
              }),
            ),
          },
          null,
          2,
        ),
        options.out,
      );
      return;
    }
    printSeed(options.seed, options.policy, options.swing);
    return;
  }
  const rows: Row[] = [];
  for (let seed = 1; seed <= options.runs; seed += 1) {
    rows.push(...generate(seed, options.policy, options.swing));
  }
  if (options.format === "json") {
    writeOutput(
      JSON.stringify(
        {
          policy: options.policy,
          runs: options.runs,
          swing: options.swing,
          summary: summarize(rows),
          archetypes: Object.fromEntries(
            (["normal", "effect", "incident"] as const).map((archetype) => [
              archetype,
              summarize(rows.filter((row) => row.archetype === archetype)),
            ]),
          ),
        },
        null,
        2,
      ),
      options.out,
    );
    return;
  }
  printSummary(options.policy, rows, options.swing);
}

main();
