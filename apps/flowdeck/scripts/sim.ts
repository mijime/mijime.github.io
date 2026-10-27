import process from "node:process";
import { formatNumber, mean, median } from "./lib/stats";
import { parseArgs, printHelp, type SimOptions } from "./lib/args";
import { runGame, runSeeds, type RunConfig, type RunResult } from "./lib/runner";
import {
  parseOverrideAssignment,
  resolveScenario,
  scenarioFromOverrides,
  type RuleOverride,
  type Scenario,
} from "./lib/scenarios";
import { runRows } from "./lib/aggregate";
import { benchmarkEntry, benchmarkJson, jsonReport, rowsToCsv, writeOutput } from "./lib/io";
import { printOverview } from "./lib/reports/overview";
import { printInsights } from "./lib/reports/insights";
import { printTrends } from "./lib/reports/trends";
import { printCorrelations } from "./lib/reports/correlations";
import { printStrategies } from "./lib/reports/strategies";
import { printTasks } from "./lib/reports/tasks";
import { printAi } from "./lib/reports/ai";
import { printRisks } from "./lib/reports/risks";
import { printCompare } from "./lib/reports/compare";
import { printScenarioTable, type ScenarioResult } from "./lib/reports/matrix";
import { printTrace } from "./lib/reports/trace";
import { printMonteCarlo } from "./lib/reports/montecarlo";
import { GAME_LENGTH_OPTIONS } from "../src/engine/rules/balance";
import { AI_PROFILES } from "../src/engine/ai/profiles";

function seedsOf(options: SimOptions): number[] {
  return Array.from({ length: options.to - options.from + 1 }, (_, index) => options.from + index);
}

function progress(done: number, total: number): void {
  console.error(`  progress ${done}/${total}`);
}

function runScenario(
  scenario: Scenario,
  options: SimOptions,
  collectDecisions = false,
  showProgress = false,
): RunResult[] {
  const config: Omit<RunConfig, "seed"> = {
    days: options.days,
    playerCount: options.players,
    rules: scenario.rules,
    aiProfile: options.aiProfile,
    weights: options.weights ?? undefined,
    collectDecisions,
  };
  return runSeeds(config, seedsOf(options), showProgress ? progress : undefined);
}

function printSeed(options: SimOptions): void {
  const scenario = resolveScenario(options.scenario, options.ruleset);
  const result = runGame({
    seed: options.seed!,
    days: options.days,
    playerCount: options.players,
    rules: scenario.rules,
    aiProfile: options.aiProfile,
    weights: options.weights ?? undefined,
    collectDecisions: true,
  });
  if (options.format === "json") {
    writeOutput(
      JSON.stringify(
        { seed: result.seed, summary: result.state.outcome, state: result.state },
        null,
        2,
      ),
      options.out,
    );
    return;
  }
  printTrace(result);
}

function resolveCompareTarget(spec: string, options: SimOptions): Scenario {
  if (spec.includes("=")) {
    const [key, value] = parseOverrideAssignment(spec);
    return scenarioFromOverrides(spec, { [key]: value } as RuleOverride, options.ruleset);
  }
  return resolveScenario(spec, options.ruleset);
}

function runMatrix(options: SimOptions): void {
  const scenario = resolveScenario(options.scenario, options.ruleset);
  const cells: ScenarioResult[] = [];
  for (const days of options.matrix!.days) {
    for (const players of options.matrix!.players) {
      const config: Omit<RunConfig, "seed"> = {
        days,
        playerCount: players,
        rules: scenario.rules,
        aiProfile: options.aiProfile,
        weights: options.weights ?? undefined,
      };
      const results = runSeeds(config, seedsOf(options), options.progress ? progress : undefined);
      cells.push({ name: `${days}d/${players}p`, days, players, results });
    }
  }
  printScenarioTable(`matrix ${scenario.label}`, cells);
}

function runScenarios(options: SimOptions): void {
  const cells = options.scenarios!.map((id) => {
    const scenario = resolveScenario(id, options.ruleset);
    return {
      name: scenario.label,
      days: options.days,
      players: options.players,
      results: runScenario(scenario, options, false, options.progress),
    };
  });
  printScenarioTable("scenarios", cells);
  printInsights(cells.flatMap((cell) => cell.results));
}

function runSweep(options: SimOptions): void {
  const cells = options.sweep!.values.map((value) => {
    const name = `${options.sweep!.key}=${String(value)}`;
    const scenario = scenarioFromOverrides(
      name,
      { [options.sweep!.key]: value } as RuleOverride,
      options.ruleset,
    );
    return {
      name,
      days: options.days,
      players: options.players,
      results: runScenario(scenario, options, false, options.progress),
    };
  });
  printScenarioTable(`sweep ${options.sweep!.key}`, cells);
  printInsights(cells.flatMap((cell) => cell.results));
}

function runCompare(options: SimOptions): void {
  const [leftId, rightId] = options.compare!;
  const left = resolveCompareTarget(leftId, options);
  const right = resolveCompareTarget(rightId, options);
  const leftResults = runScenario(left, options, false, options.progress);
  const rightResults = runScenario(right, options, false, options.progress);
  printCompare({ name: leftId, results: leftResults }, { name: rightId, results: rightResults });
}

function runBenchmark(options: SimOptions): void {
  const entries = [];
  for (const aiProfile of AI_PROFILES) {
    for (const swing of [0, 0.1, 0.2]) {
      for (const players of [4, 5, 6]) {
        for (const days of GAME_LENGTH_OPTIONS) {
          // 長丁場は1回が重いので、基準データは最大200シードに抑える。
          const runs = days > 30 ? Math.min(options.runs, 200) : options.runs;
          const config: Omit<RunConfig, "seed"> = {
            days,
            playerCount: players,
            rules: resolveScenario("base", options.ruleset).rules,
            generationSwing: swing,
            aiProfile,
          };
          const results = runSeeds(
            config,
            Array.from({ length: runs }, (_, index) => index + 1),
            options.progress ? progress : undefined,
          );
          entries.push(benchmarkEntry(results, players, days, swing, aiProfile));
          console.error(`  benchmark ${aiProfile} swing=${swing} ${players}p/${days}d done`);
        }
      }
    }
  }
  writeOutput(benchmarkJson(entries), options.out);
}

function printReports(results: RunResult[], options: SimOptions): void {
  const wantsAll = options.all;
  if (wantsAll || options.overview) {
    printOverview(results, {
      days: options.days,
      players: options.players,
      scenario: options.scenario,
      runs: results.length,
    });
  }
  if (wantsAll || options.trends) printTrends(results, options.days);
  if (wantsAll || options.correlations) printCorrelations(results);
  if (wantsAll || options.strategies) {
    printStrategies(
      {
        from: options.from,
        to: options.to,
        days: options.days,
        players: options.players,
        rules: resolveScenario(options.scenario, options.ruleset).rules,
        aiProfile: options.aiProfile,
        baselineName: options.weights ? "current" : "random(roster)",
      },
      results,
      options.progress,
    );
  }
  if (wantsAll || options.tasks) printTasks(results);
  if (wantsAll || options.ai) printAi(results);
  if (wantsAll || options.risks) printRisks(results);
  if (wantsAll || options.overview || options.insights) printInsights(results);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (options.benchmark) {
    runBenchmark(options);
    return;
  }
  if (options.montecarlo) {
    const scenario = resolveScenario(options.scenario, options.ruleset);
    printMonteCarlo({
      days: options.days,
      players: options.players,
      rules: scenario.rules,
      aiProfile: options.aiProfile,
      samples: options.samples,
      seeds: options.mcSeeds,
      seed: options.mcSeed,
      scope: options.mcScope,
      top: options.top,
      progress: options.progress,
    });
    return;
  }
  if (options.seed !== null) {
    printSeed(options);
    return;
  }
  if (options.trace !== null) {
    const scenario = resolveScenario(options.scenario, options.ruleset);
    printTrace(
      runGame({
        seed: options.trace,
        days: options.days,
        playerCount: options.players,
        rules: scenario.rules,
        aiProfile: options.aiProfile,
        weights: options.weights ?? undefined,
        collectDecisions: true,
      }),
    );
    return;
  }
  if (options.compare) {
    runCompare(options);
    return;
  }
  if (options.matrix) {
    runMatrix(options);
    return;
  }
  if (options.scenarios) {
    runScenarios(options);
    return;
  }
  if (options.sweep) {
    runSweep(options);
    return;
  }

  const scenario = resolveScenario(options.scenario, options.ruleset);
  const collectDecisions = options.ai || options.all;
  const results = runScenario(scenario, options, collectDecisions, options.progress);
  const rows = runRows(results);

  if (options.format === "csv") {
    writeOutput(rowsToCsv(rows), options.out);
    return;
  }
  if (options.format === "json") {
    writeOutput(jsonReport(results, rows), options.out);
    return;
  }

  console.log("Flowdeck balance simulation");
  console.log(
    `  days=${options.days} runs=${results.length} players=${options.players} scenario=${scenario.id}`,
  );
  console.log(
    `  actions/game=${formatNumber(mean(rows.map((row) => row.play + row.pull + row.trash)))} / score median=${formatNumber(median(rows.map((row) => row.finalScore)))}`,
  );
  printReports(results, options);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
