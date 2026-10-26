import { simulate } from "./simulator.ts";
import type { Event, SimulationConfig } from "./types.ts";

export interface RiskSummary {
  trials: number;
  /** 最終資産の下位10% / 中央値 / 上位10%（万円） */
  p10: number;
  p50: number;
  p90: number;
  /** シミュレーション中に総資産がマイナスになった割合（0〜1） */
  depletionProbability: number;
}

export interface RiskOptions {
  trials?: number;
  seed?: number;
}

const INVESTMENT = /NISA|iDeCo|投資|株|債券|ファンド/;
const LIABILITY = /借入|ローン|負債/;
const HOUSE = /住宅|自宅/;

const ILLNESS_COST = 100;
const CARE_START_AGE = 80;
const CARE_PROBABILITY = 0.3;
const CARE_MONTHLY = 9;
const CARE_ONE_TIME = 47;
const CARE_YEARS = 5;
const RETURN_SD = 0.08;

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function normal(random: () => number): number {
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * 年齢別の大病（主にがん）罹患確率の近似。
 * 国立がん研究センターの生涯罹患リスク（約2人に1人）に合わせ、
 * 40代以降で徐々に高くなるモデル。
 */
function illnessProbability(age: number): number {
  if (age < 40) return 0.001;
  if (age < 50) return 0.003;
  if (age < 60) return 0.007;
  if (age < 70) return 0.012;
  if (age < 80) return 0.018;
  return 0.015;
}

/**
 * 投資リターンと病気・介護の発生をランダムに振った試算。
 * 金額は万円。結果はパーセンタイルで返す。
 */
export function simulateRisk(config: SimulationConfig, options: RiskOptions = {}): RiskSummary {
  const trials = Math.max(1, Math.floor(options.trials ?? 1000));
  const random = mulberry32(options.seed ?? 42);
  const startAge = config.currentAge;
  const endAge = config.currentAge + config.simulationYears - 1;
  const finals: number[] = [];
  let depleted = 0;

  for (let trial = 0; trial < trials; trial++) {
    const events: Event[] = structuredClone(config.scenario.events);

    for (let age = startAge; age <= endAge; age++) {
      if (random() < illnessProbability(age)) {
        events.push({
          name: "大病",
          group: "リスク",
          startAge: age,
          endAge: age,
          ops: [{ asset: "現金", op: "-", value: ILLNESS_COST }],
        });
      }
    }

    if (endAge >= CARE_START_AGE && random() < CARE_PROBABILITY) {
      events.push({
        name: "介護一時費用",
        group: "リスク",
        startAge: CARE_START_AGE,
        endAge: CARE_START_AGE,
        ops: [{ asset: "現金", op: "-", value: CARE_ONE_TIME }],
      });
      for (let offset = 0; offset < CARE_YEARS; offset++) {
        const age = CARE_START_AGE + offset;
        if (age > endAge) break;
        events.push({
          name: "介護費用",
          group: "リスク",
          startAge: age,
          endAge: age,
          ops: [{ asset: "現金", op: "-", value: CARE_MONTHLY * 12 }],
        });
      }
    }

    const rows = simulate({
      ...config,
      scenario: { ...config.scenario, events },
      autoDrawdown: config.autoDrawdown ?? true,
      returnFactor: (asset, _age, base) => {
        if (
          asset === "現金" ||
          LIABILITY.test(asset) ||
          HOUSE.test(asset) ||
          !INVESTMENT.test(asset)
        ) {
          return base;
        }
        const sampled = base - 1 + normal(random) * RETURN_SD;
        // 極端な負のリターンでも資産がマイナスになりすぎないよう下限を置く。
        return Math.max(0.5, 1 + sampled);
      },
    });
    const final = rows.length > 0 ? rows[rows.length - 1].totalAssets : 0;
    const minimum = rows.reduce(
      (min, row) => Math.min(min, row.totalAssets),
      Number.POSITIVE_INFINITY,
    );
    if (minimum < 0) depleted++;
    finals.push(final);
  }

  finals.sort((a, b) => a - b);
  const percentile = (p: number) =>
    finals[Math.min(finals.length - 1, Math.floor((finals.length - 1) * p))] ?? 0;

  return {
    trials,
    p10: percentile(0.1),
    p50: percentile(0.5),
    p90: percentile(0.9),
    depletionProbability: depleted / trials,
  };
}
