import type { TaskGenerationPolicy } from "../engine/rules/generation";
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

interface EffectSpec {
  kind: CardEffectKind;
  amount: number;
}

const NORMAL_COUNT = 42;
const EFFECT_COUNT = 24;
const INCIDENT_COUNT = 6;

const NORMAL_SCORES = [
  1,
  ...Array<number>(14).fill(2),
  ...Array<number>(18).fill(3),
  ...Array<number>(7).fill(6),
  ...Array<number>(2).fill(7),
];

const INCIDENT_SCORES = [1, 1, 2, 2, 2, 2];

const EFFECT_SPECS: EffectSpec[] = [
  ...Array.from({ length: 6 }, () => ({ kind: "draw" as const, amount: 1 })),
  ...Array.from({ length: 3 }, () => ({ kind: "action" as const, amount: 1 })),
  { kind: "debt-clean", amount: 1 },
  { kind: "debt-clean", amount: 2 },
  { kind: "debt-clean", amount: 2 },
  ...Array.from({ length: 4 }, () => ({ kind: "deadline" as const, amount: 1 })),
  ...Array.from({ length: 5 }, () => ({ kind: "token" as const, amount: 1 })),
  { kind: "token", amount: 2 },
  ...Array.from({ length: 2 }, () => ({ kind: "shield" as const, amount: 1 })),
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
  }
}

function effectScore(spec: EffectSpec): number {
  if (spec.kind === "debt-clean") return spec.amount === 1 ? 2 : 1;
  if (spec.kind === "deadline" || spec.kind === "shield") return 2;
  return 1;
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
  }
}

/**
 * テンプレートを使わず、テーマ・比率・価値-first だけで72枚を生成する。
 * 名前・スコア・報酬・納期・効果・罰則を毎ゲーム作り直す。
 */
export function generateAutoTasks(state: GameState, totalScale = 1): TaskDef[] {
  const defs: TaskDef[] = [];
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

  const add = (def: TaskDef): void => {
    applyValueRequirements(def, state, totalScale);
    defs.push(def);
  };

  for (const score of NORMAL_SCORES) {
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

  const effectSpecs = shuffle(state, EFFECT_SPECS);
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

  const penalties = shuffle(state, PENALTY_POOL).slice(0, INCIDENT_COUNT);
  for (const score of INCIDENT_SCORES) {
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

  return defs;
}

export const AUTO_GENERATION: TaskGenerationPolicy = {
  base: () => {},
  modifiers: [],
  create: (state) => generateAutoTasks(state, 1.12),
};

export const AUTO_COUNTS = {
  normal: NORMAL_COUNT,
  effect: EFFECT_COUNT,
  incident: INCIDENT_COUNT,
};
