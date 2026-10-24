import type { TaskGenerationPolicy } from "../engine/rules/generation";
import { randInt } from "../engine/rng";
import type { GameState, TaskDef } from "../engine/types";
import { applyValueRequirements, redistribute } from "./generationMath";
import { TASK_DEFS } from "./tasks";

export { taskEfficiency, taskValue, totalRequirements } from "./generationMath";

/**
 * スコア帯ごとの要求合計の予算。
 * 低スコアは軽く、高スコアは重く。効果タスクは報酬込みでやや重め。
 */
function requirementBudget(def: TaskDef): readonly [number, number] {
  if (def.kind === "incident") return [11, 16];
  if (def.reward.effect) return [14, 19];
  switch (def.score) {
    case 1:
      return [8, 11];
    case 2:
      return [10, 13];
    case 3:
      return [14, 18];
    case 6:
      return [21, 25];
    case 7:
      return [23, 28];
    default:
      return [12, 22];
  }
}

/** 予算内の基準値に、1d10: 2/6/2 の難易度揺らぎをかける。効果/インシデントは控えめ。 */
function budgetRequirementTotal(def: TaskDef, state: GameState): number {
  const [min, max] = requirementBudget(def);
  const base = min + randInt(state, max - min + 1);
  const roll = randInt(state, 10);
  const swing = roll < 2 ? -0.05 : roll < 8 ? 0 : 0.05;
  const scale = def.kind === "incident" || def.reward.effect ? 1 : 2;
  return Math.max(1, Math.round(base * (1 + swing * scale)));
}

/**
 * スコア帯の予算から要求合計を決める方式。
 * 名前・スコア・報酬・納期はテンプレートの印刷値をそのまま使う。
 */
export const BUDGET_GENERATION: TaskGenerationPolicy = {
  base(def, ctx) {
    redistribute(def.requirements, budgetRequirementTotal(def, ctx.state));
  },
  modifiers: [],
};

/**
 * 価値（スコア+報酬lv+効果+罰則）から要求合計を逆算する方式。
 * 極端に得なタスク/損なタスクを抑えたいときに使う。
 */
export const VALUE_GENERATION: TaskGenerationPolicy = {
  base(def, ctx) {
    applyValueRequirements(def, ctx.state);
  },
  modifiers: [],
};

export function generateTaskDefs(
  state: GameState,
  policy: TaskGenerationPolicy = BUDGET_GENERATION,
): TaskDef[] {
  if (policy.create) return policy.create(state);

  const defs: TaskDef[] = [];

  for (const template of TASK_DEFS) {
    const def: TaskDef = {
      ...template,
      requirements: { ...template.requirements },
      reward: { ...template.reward },
      penalty: template.penalty ? { ...template.penalty } : undefined,
    };
    const ctx = {
      state,
      kind: def.kind ?? "normal",
      randInt: (max: number) => randInt(state, max),
    };
    policy.base(def, ctx);
    for (const modifier of policy.modifiers) modifier.apply(def, ctx);
    defs.push(def);
  }

  return defs;
}
