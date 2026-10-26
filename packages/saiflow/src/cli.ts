#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildAdvice, type Advice } from "./advice.ts";
import { simulateRisk, type RiskSummary } from "./risk.ts";
import { parseDSL } from "./parser.ts";
import { simulate } from "./simulator.ts";
import type { ParseError, Scenario, YearRow } from "./types.ts";
import { fmt } from "./utils.ts";

const SAMPLE_URL = new URL("./data/sample.txt", import.meta.url);

function sampleFile(): string {
  if (SAMPLE_URL.protocol === "file:") return fileURLToPath(SAMPLE_URL);
  // Vitest loads this module from a non-file URL.
  const candidates = [
    resolve(process.cwd(), "src/data/sample.txt"),
    resolve(process.cwd(), "packages/saiflow/src/data/sample.txt"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("sample.txt が見つかりません");
  return found;
}
const ADVICE_LABELS = {
  danger: "要対応",
  warning: "注意",
  info: "参考",
  good: "良好",
} as const;

export interface CliOutput {
  out: (text: string) => void;
  err: (text: string) => void;
}

const defaultIo: CliOutput = {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
};

interface Options {
  file: string | null;
  age: number;
  years: number;
  scenario: string | null;
  all: boolean;
  csv: boolean;
  json: boolean;
  advice: boolean;
  autoDrawdown: boolean;
  estimateTaxes: boolean;
  trials: number;
  seed: number;
  help: boolean;
}

function usage(): string {
  return `saiflow CLI — ライフプランを年単位でシミュレーション

使い方:
  node packages/saiflow/src/cli.ts [file.txt] [options]
  pnpm sim [file.txt] [options]

オプション:
  -a, --age <n>        現在の年齢 (default: 35)
  -y, --years <n>      シミュレーション年数 (default: 50)
  -s, --scenario <n>   シナリオ名または1始まりの番号 (default: 先頭)
      --all            すべてのシナリオを出力
      --csv            CSVで出力
      --json           JSONで出力
      --no-advice      アドバイスを表示しない
      --no-drawdown    現金不足時に投資を自動取り崩さない
      --no-tax         所得税・社会保険の概算を差し引かない
      --trials <n>     病気・介護・変動リターンのリスク試算をn回行う
      --seed <n>       リスク試算の乱数シード (default: 42)
  -h, --help           このヘルプ

入力ファイルを省略するとサンプルデータを使います。

例:
  pnpm sim --years 30
  pnpm sim my-plan.txt --age 40 --years 40
  pnpm sim --scenario 早期リタイア --csv > out.csv
`;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

function parseCliArgs(argv: string[]): Options {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      age: { type: "string", short: "a" },
      years: { type: "string", short: "y" },
      scenario: { type: "string", short: "s" },
      all: { type: "boolean" },
      csv: { type: "boolean" },
      json: { type: "boolean" },
      "no-advice": { type: "boolean" },
      "no-drawdown": { type: "boolean" },
      "no-tax": { type: "boolean" },
      trials: { type: "string" },
      seed: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (positionals.length > 1) {
    throw new Error("入力ファイルは1つだけ指定してください");
  }

  return {
    file: positionals[0] ?? null,
    age: parseNumber(values.age, 35),
    years: parseNumber(values.years, 50),
    scenario: values.scenario ?? null,
    all: values.all ?? false,
    csv: values.csv ?? false,
    json: values.json ?? false,
    advice: !(values["no-advice"] ?? false),
    autoDrawdown: !(values["no-drawdown"] ?? false),
    estimateTaxes: !(values["no-tax"] ?? false),
    trials: parseNumber(values.trials, 0),
    seed: parseNumber(values.seed, 42),
    help: values.help ?? false,
  };
}

function width(text: string): number {
  let result = 0;
  for (const char of text) {
    result +=
      /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/u.test(
        char,
      )
        ? 2
        : 1;
  }
  return result;
}

function pad(text: string, length: number, align: "left" | "right"): string {
  const padding = " ".repeat(Math.max(0, length - width(text)));
  return align === "left" ? `${text}${padding}` : `${padding}${text}`;
}

function cell(row: YearRow, column: string): string {
  switch (column) {
    case "年齢":
      return String(row.age);
    case "収入":
      return fmt(Math.round(row.totalIncome));
    case "支出":
      return fmt(Math.round(row.totalExpense));
    case "現金収支":
      return fmt(Math.round(row.totalIncome - row.totalExpense));
    case "総資産":
      return fmt(Math.round(row.totalAssets));
    default:
      return fmt(Math.round(row.balances[column] ?? 0));
  }
}

export function formatTable(rows: YearRow[], scenario: Scenario): string {
  if (rows.length === 0) return `${scenario.name}: 表示できる年がありません\n`;

  const assets = [...new Set(rows.flatMap((row) => Object.keys(row.balances)))].toSorted();
  const columns = ["年齢", "収入", "支出", "現金収支", "総資産", ...assets];
  const aligns: ("left" | "right")[] = columns.map((column) =>
    column === "年齢" ? "left" : "right",
  );
  const widths = columns.map((column) =>
    Math.max(width(column), ...rows.map((row) => width(cell(row, column)))),
  );

  const lines: string[] = [];
  lines.push(
    `${scenario.name}（${rows[0].age}〜${rows[rows.length - 1].age}歳 / ${rows.length}年）`,
    "※ 収入・支出・現金収支は現金ベース（借入・積立・運用益を除く）",
  );
  const header = columns.map((column, i) => pad(column, widths[i], aligns[i])).join("  ");
  lines.push(header);
  lines.push(widths.map((w) => "-".repeat(w)).join("  "));

  for (const row of rows) {
    lines.push(columns.map((column, i) => pad(cell(row, column), widths[i], aligns[i])).join("  "));
  }

  const last = rows[rows.length - 1];
  lines.push(
    "",
    `最終（${last.age}歳）: 総資産 ${fmt(Math.round(last.totalAssets))}万円 / 現金 ${fmt(Math.round(last.balances["現金"] ?? 0))}万円`,
  );
  return `${lines.join("\n")}\n`;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

interface CsvResult {
  scenario: Scenario;
  rows: YearRow[];
}

export function formatCsvResults(results: CsvResult[], includeScenario: boolean): string {
  const assets = [
    ...new Set(results.flatMap(({ rows }) => rows.flatMap((row) => Object.keys(row.balances)))),
  ].toSorted();
  const header = [
    ...(includeScenario ? ["シナリオ"] : []),
    "年齢",
    "収入",
    "支出",
    "現金収支",
    "総資産",
    ...assets,
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const { scenario, rows } of results) {
    for (const row of rows) {
      const values = [
        ...(includeScenario ? [scenario.name] : []),
        String(row.age),
        String(Math.round(row.totalIncome)),
        String(Math.round(row.totalExpense)),
        String(Math.round(row.totalIncome - row.totalExpense)),
        String(Math.round(row.totalAssets)),
        ...assets.map((asset) => String(Math.round(row.balances[asset] ?? 0))),
      ];
      lines.push(values.map(csvEscape).join(","));
    }
  }
  return `${lines.join("\n")}\n`;
}

export function formatCsv(rows: YearRow[], scenario: Scenario, includeScenario: boolean): string {
  return formatCsvResults([{ scenario, rows }], includeScenario);
}

export function formatAdvice(advice: Advice[]): string {
  if (advice.length === 0) return "";
  const lines = ["", "気づき:"];
  for (const item of advice) {
    lines.push(`  [${ADVICE_LABELS[item.level]}] ${item.title}`);
    lines.push(`    ${item.detail}`);
  }
  return `${lines.join("\n")}\n`;
}

export function formatRisk(risk: RiskSummary | null): string {
  if (!risk) return "";
  return `\nリスク試算（${risk.trials}回）:
  最終資産 P10: ${fmt(Math.round(risk.p10))}万円 / P50: ${fmt(Math.round(risk.p50))}万円 / P90: ${fmt(Math.round(risk.p90))}万円
  途中で資産がマイナスになる確率: ${(risk.depletionProbability * 100).toFixed(1)}%
  前提: 投資リターン±8%、大病（40代以降 年0.3〜1.8%・自己負担100万円）、介護（80歳で30%・5年・月9万円）
`;
}

function formatErrors(errors: ParseError[], text: string): string {
  const lines = text.split("\n");
  return errors
    .map((error) => {
      const source = lines[error.line - 1]?.trim() ?? "";
      return `L${error.line}: ${error.message}${source ? `\n  ${source}` : ""}`;
    })
    .join("\n");
}

function selectScenarios(
  scenarios: Scenario[],
  selector: string | null,
  all: boolean,
): Scenario[] | string {
  if (all) return scenarios;
  if (selector === null) return [scenarios[0]];

  const number = Number(selector);
  if (Number.isInteger(number) && number >= 1 && number <= scenarios.length) {
    return [scenarios[number - 1]];
  }

  const matched = scenarios.find((scenario) => scenario.name === selector);
  if (matched) return [matched];

  const partial = scenarios.filter((scenario) => scenario.name.includes(selector));
  if (partial.length === 1) return partial;

  return `シナリオ「${selector}」が見つかりません。候補: ${scenarios
    .map((scenario) => scenario.name)
    .join(" / ")}`;
}

export function runCli(argv: string[], io: CliOutput = defaultIo): number {
  let options: Options;
  try {
    options = parseCliArgs(argv);
  } catch (error) {
    io.err(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}`);
    return 1;
  }

  if (options.help) {
    io.out(usage());
    return 0;
  }

  if (!Number.isFinite(options.age) || options.age <= 0 || options.age >= 120) {
    io.err("--age は1〜119の数値で指定してください\n");
    return 1;
  }
  if (!Number.isFinite(options.years) || options.years <= 0 || options.years > 100) {
    io.err("--years は1〜100の数値で指定してください\n");
    return 1;
  }
  if (options.csv && options.json) {
    io.err("--csv と --json は同時に指定できません\n");
    return 1;
  }
  if (!Number.isFinite(options.trials) || options.trials < 0 || options.trials > 10_000) {
    io.err("--trials は0〜10000の数値で指定してください\n");
    return 1;
  }
  if (!Number.isFinite(options.seed)) {
    io.err("--seed は数値で指定してください\n");
    return 1;
  }

  let text: string;
  try {
    text = readFileSync(options.file ?? sampleFile(), "utf8");
  } catch (error) {
    io.err(
      `入力ファイルを読み込めません: ${options.file ?? "サンプル"}\n${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }

  const parsed = parseDSL(text);
  if (parsed.errors.length > 0) {
    io.err(`DSLの解析に失敗しました:\n${formatErrors(parsed.errors, text)}\n`);
    return 1;
  }

  const selected = selectScenarios(parsed.scenarios, options.scenario, options.all);
  if (typeof selected === "string") {
    io.err(`${selected}\n`);
    return 1;
  }

  const results = selected.map((scenario) => {
    const rows = simulate({
      currentAge: options.age,
      simulationYears: options.years,
      scenario,
      autoDrawdown: options.autoDrawdown,
      estimateTaxes: options.estimateTaxes,
    }).filter((row) => row.age >= options.age);
    const advice = options.advice ? buildAdvice(rows, scenario, options.age) : [];
    const risk =
      options.trials > 0
        ? simulateRisk(
            {
              currentAge: options.age,
              simulationYears: options.years,
              scenario,
              autoDrawdown: options.autoDrawdown,
              estimateTaxes: options.estimateTaxes,
            },
            { trials: options.trials, seed: options.seed },
          )
        : null;
    return { scenario, rows, advice, risk };
  });

  if (options.json) {
    const payload = results.map(({ scenario, rows, advice, risk }) => ({
      scenario,
      currentAge: options.age,
      simulationYears: options.years,
      rows,
      advice,
      risk,
    }));
    io.out(`${JSON.stringify(payload.length === 1 ? payload[0] : payload, null, 2)}\n`);
    return 0;
  }

  if (options.csv) {
    io.out(formatCsvResults(results, results.length > 1));
    return 0;
  }

  io.out(
    results
      .map(
        ({ scenario, rows, advice, risk }) =>
          `${formatTable(rows, scenario)}${formatAdvice(advice)}${formatRisk(risk)}`,
      )
      .join("\n"),
  );
  return 0;
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  process.exitCode = runCli(process.argv.slice(2));
}
