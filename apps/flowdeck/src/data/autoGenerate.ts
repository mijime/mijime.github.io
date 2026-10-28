import type { TaskGenerationPolicy } from "../engine/rules/generation";
import { DEFAULT_GENERATION_SWING } from "../engine/rules/generation";
import { randInt, shuffle } from "../engine/rng";
import type {
  CardEffect,
  CardEffectKind,
  GameState,
  TaskDef,
  TaskPenalty,
  TaskReward,
} from "../engine/types";
import { applyValueRequirements } from "./generationMath";
import {
  EFFECT_TITLES,
  INCIDENT_SUFFIXES,
  NORMAL_SUFFIXES,
  TASK_THEMES,
  type TaskTheme,
} from "./taskThemes";

type EffectSpec =
  | { kind: "draw"; amount: number }
  | { kind: "action"; amount: number }
  | { kind: "debt-clean"; amount: number }
  | { kind: "deadline"; amount: number }
  | { kind: "token"; amount: number }
  | { kind: "shield"; amount: number }
  | { kind: "cycle"; draw: number; discard: number }
  | { kind: "recover"; amount: number }
  | { kind: "refresh"; draw: number };

interface DeckCounts {
  normal: number;
  effect: number;
  incident: number;
  relic: number;
}

/** 日数ごとの山札構成。10日は効果カードを通常より多くしてコンボを試しやすくする。 */
const DECK_COUNTS: Record<number, DeckCounts> = {
  10: { normal: 10, effect: 16, incident: 3, relic: 1 },
  20: { normal: 19, effect: 25, incident: 4, relic: 1 },
  30: { normal: 24, effect: 31, incident: 5, relic: 2 },
  100: { normal: 28, effect: 38, incident: 6, relic: 4 },
};

const NORMAL_SCORES = [
  1,
  ...Array<number>(14).fill(2),
  ...Array<number>(18).fill(3),
  ...Array<number>(7).fill(6),
  ...Array<number>(2).fill(7),
];

const INCIDENT_SCORES = [1, 1, 2, 2, 2, 2];

/** アクションとドローを厚くした効果プール。 */
const EFFECT_SPECS: EffectSpec[] = [
  ...Array.from({ length: 6 }, () => ({ kind: "draw" as const, amount: 1 })),
  ...Array.from({ length: 4 }, () => ({ kind: "draw" as const, amount: 2 })),
  ...Array.from({ length: 8 }, () => ({ kind: "action" as const, amount: 1 })),
  ...Array.from({ length: 4 }, () => ({ kind: "action" as const, amount: 2 })),
  ...Array.from({ length: 3 }, () => ({ kind: "debt-clean" as const, amount: 1 })),
  ...Array.from({ length: 2 }, () => ({ kind: "debt-clean" as const, amount: 2 })),
  ...Array.from({ length: 3 }, () => ({ kind: "deadline" as const, amount: 1 })),
  ...Array.from({ length: 3 }, () => ({ kind: "token" as const, amount: 1 })),
  ...Array.from({ length: 2 }, () => ({ kind: "shield" as const, amount: 1 })),
  ...Array.from({ length: 2 }, () => ({ kind: "cycle" as const, draw: 1, discard: 1 })),
  { kind: "recover", amount: 1 },
  ...Array.from({ length: 2 }, () => ({ kind: "refresh" as const, draw: 3 })),
];

const RELIC_TITLES = [
  "全社LLM移行",
  "ゼロダウンタイム基盤刷新",
  "推論コスト半減",
  "マルチテナント分離",
  "エージェント全社展開",
  "GPUクラスタ再構築",
  "レガシー脱却",
  "次世代API統合",
];

const RELIC_PENALTIES: TaskPenalty[] = [
  { kind: "debt", target: "all", amount: 3 },
  { kind: "debt", target: "all", amount: 2 },
  { kind: "teamScore", amount: 6 },
  { kind: "discardHand", target: "all" },
  { kind: "loseAction", target: "all", amount: 2 },
];

const PENALTY_POOL: TaskPenalty[] = [
  { kind: "debt", target: "all", amount: 1 },
  { kind: "debt", target: "all", amount: 2 },
  { kind: "debt", target: "owner", amount: 1 },
  { kind: "debt", target: "owner", amount: 2 },
  { kind: "teamScore", amount: 3 },
  { kind: "discardHand", target: "owner" },
  { kind: "discardHand", target: "all" },
  { kind: "loseAction", target: "all", amount: 1 },
  { kind: "loseAction", target: "owner", amount: 1 },
];

function countsFor(totalDays: number): DeckCounts {
  return DECK_COUNTS[totalDays] ?? DECK_COUNTS[10]!;
}

function pickWeightedTheme(state: GameState): TaskTheme {
  const total = TASK_THEMES.reduce((sum, theme) => sum + theme.weight, 0);
  let roll = randInt(state, total);
  for (const theme of TASK_THEMES) {
    roll -= theme.weight;
    if (roll < 0) return theme;
  }
  return TASK_THEMES[0]!;
}

function pickRewardType(state: GameState, theme: TaskTheme): TaskReward["type"] {
  const weights = theme.rewardWeights;
  const total = weights.design + weights.dev + weights.test;
  let roll = randInt(state, total);
  roll -= weights.design;
  if (roll < 0) return "design";
  roll -= weights.dev;
  if (roll < 0) return "dev";
  return "test";
}

function pickOne<T>(state: GameState, values: readonly T[]): T {
  return values[randInt(state, values.length)] ?? values[0]!;
}

function normalDeadline(state: GameState, score: number): number {
  if (score >= 6) return 6;
  if (score === 3) return 5 + randInt(state, 2);
  return 4 + randInt(state, 2);
}

function makeEffect(spec: EffectSpec): CardEffect {
  switch (spec.kind) {
    case "draw":
      return { kind: "draw", amount: spec.amount };
    case "action":
      return { kind: "action", amount: spec.amount };
    case "debt-clean":
      return { kind: "debt-clean", amount: spec.amount };
    case "deadline":
      return { kind: "deadline", amount: spec.amount };
    case "token":
      return { kind: "token", token: "mi", amount: spec.amount };
    case "shield":
      return { kind: "shield", amount: spec.amount };
    case "cycle":
      return { kind: "cycle", draw: spec.draw, discard: spec.discard };
    case "recover":
      return { kind: "recover", amount: spec.amount };
    case "refresh":
      return { kind: "refresh", draw: spec.draw };
  }
}

function effectScore(spec: EffectSpec): number {
  // 効果カード自体が企業価値になるよう、基本スコアを+2する。
  // 要求量は applyValueRequirements がスコア込みの価値から逆算する。
  if (spec.kind === "draw" || spec.kind === "action") return spec.amount >= 2 ? 4 : 3;
  if (spec.kind === "debt-clean") return spec.amount === 1 ? 4 : 3;
  if (spec.kind === "deadline" || spec.kind === "shield" || spec.kind === "refresh") return 4;
  return 3;
}

function effectRewardLevel(state: GameState, spec: EffectSpec): number {
  switch (spec.kind) {
    case "draw":
    case "action":
      return 5;
    case "debt-clean":
      return spec.amount === 1 ? 5 : 4;
    case "deadline":
      return 3;
    case "token":
      return 4 + randInt(state, 2);
    case "shield":
      return 3 + randInt(state, 2);
    case "cycle":
    case "recover":
    case "refresh":
      return 4;
  }
}

/**
 * テンプレートを使わず、テーマ・比率・価値-first でタスクを作る。
 * 日数に応じて山札枚数を変え、レリックタスクも生成する。
 */
export function generateAutoTasks(
  state: GameState,
  totalScale = 1,
  swing = DEFAULT_GENERATION_SWING,
): TaskDef[] {
  const defs: TaskDef[] = [];
  const counts = countsFor(state.totalDays);
  const usedNames = new Set<string>();

  const uniqueName = (base: string): string => {
    let name = base;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${base} ${suffix}`;
      suffix += 1;
    }
    usedNames.add(name);
    return name;
  };

  const effectTitles = new Map<CardEffectKind, string[]>();
  const effectTitle = (spec: EffectSpec): string => {
    let pool = effectTitles.get(spec.kind);
    if (!pool || pool.length === 0) {
      pool = shuffle(state, EFFECT_TITLES[spec.kind]);
      effectTitles.set(spec.kind, pool);
    }
    const title = pool.pop() ?? EFFECT_TITLES[spec.kind][0]!;
    return uniqueName(title);
  };

  const add = (def: TaskDef, requirementScale = 1): void => {
    applyValueRequirements(def, state, totalScale, swing);
    if (requirementScale !== 1) {
      for (const phase of ["design", "dev", "test"] as const) {
        if (def.requirements[phase] > 0) {
          def.requirements[phase] = Math.max(
            1,
            Math.round(def.requirements[phase] * requirementScale),
          );
        }
      }
    }
    defs.push(def);
  };

  const normalScores = shuffle(state, NORMAL_SCORES).slice(0, counts.normal);
  for (const score of normalScores) {
    const theme = pickWeightedTheme(state);
    const subject = pickOne(state, theme.subjects);
    const suffix = pickOne(state, NORMAL_SUFFIXES);
    const title = uniqueName(
      randInt(state, 2) === 0 ? `${subject}の${suffix}` : `${subject}${suffix}`,
    );
    add({
      id: `auto-${defs.length}`,
      title,
      theme: theme.id,
      requirements: { ...theme.phaseWeights },
      score,
      deadline: normalDeadline(state, score),
      reward: { type: pickRewardType(state, theme), level: score >= 6 ? 2 : 3 },
      kind: "normal",
    });
  }

  const effectSpecs = shuffle(state, EFFECT_SPECS).slice(0, counts.effect);
  for (const spec of effectSpecs) {
    const theme = pickWeightedTheme(state);
    add({
      id: `auto-${defs.length}`,
      title: effectTitle(spec),
      theme: theme.id,
      requirements: { ...theme.phaseWeights },
      score: effectScore(spec),
      deadline: 5,
      reward: {
        type: pickRewardType(state, theme),
        level: effectRewardLevel(state, spec),
        effect: makeEffect(spec),
      },
      kind: "normal",
    });
  }

  const penalties = shuffle(state, PENALTY_POOL);
  const incidentScores = shuffle(state, INCIDENT_SCORES).slice(0, counts.incident);
  for (const score of incidentScores) {
    const theme = pickWeightedTheme(state);
    const subject = pickOne(state, theme.incidentSubjects);
    const suffix = pickOne(state, INCIDENT_SUFFIXES);
    const penalty = penalties.pop();
    add({
      id: `auto-${defs.length}`,
      title: uniqueName(`${subject}${suffix}`),
      theme: theme.id,
      requirements: { ...theme.phaseWeights },
      score,
      deadline: score === 1 ? 2 : 3,
      reward: { type: pickRewardType(state, theme), level: score === 1 ? 2 : 3 },
      kind: "incident",
      penalty: penalty ? { ...penalty } : undefined,
    });
  }

  const relicTitles = shuffle(state, RELIC_TITLES);
  const relicPenalties = shuffle(state, RELIC_PENALTIES);
  for (let index = 0; index < counts.relic; index += 1) {
    const theme = pickWeightedTheme(state);
    add(
      {
        id: `auto-${defs.length}`,
        title: uniqueName(relicTitles[index % relicTitles.length] ?? "全社移行"),
        theme: theme.id,
        requirements: { ...theme.phaseWeights },
        score: 8,
        deadline: 8,
        kind: "relic",
        penalty: relicPenalties[index % relicPenalties.length] ?? {
          kind: "debt",
          target: "all",
          amount: 3,
        },
      },
      2.2,
    );
  }

  return defs;
}

export const AUTO_GENERATION: TaskGenerationPolicy = {
  base: () => {},
  modifiers: [],
  create: (state, swing) => generateAutoTasks(state, 1.12, swing),
};

export const AUTO_COUNTS = {
  normal: 28,
  effect: 38,
  incident: 6,
  relic: 4,
};
