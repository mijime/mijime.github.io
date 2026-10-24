import { effectGenerationValue } from "../engine/rules/effects";
import { penaltyGenerationValue } from "../engine/rules/penalties";
import { randInt } from "../engine/rng";
import type { GameState, TaskDef, TaskRequirements } from "../engine/types";

export type Phase = keyof TaskRequirements;

export const PHASES: readonly Phase[] = ["design", "dev", "test"];

export function totalRequirements(requirements: TaskRequirements): number {
  return requirements.design + requirements.dev + requirements.test;
}

/** スコア・報酬lv・効果・罰則をまとめた生成時の価値 */
export function taskValue(def: TaskDef): number {
  return (
    def.score +
    def.reward.level * 0.5 +
    effectGenerationValue(def.reward.effect) +
    penaltyGenerationValue(def.penalty)
  );
}

export function taskEfficiency(def: TaskDef): number {
  const total = totalRequirements(def.requirements);
  return total > 0 ? taskValue(def) / total : 0;
}

/**
 * 要求合計を目標値へ、テンプレートの設計/開発/テスト比で配分する。
 * 0のフェーズは0のまま。端数は小数部の大きいフェーズから配る。
 */
export function redistribute(requirements: TaskRequirements, targetTotal: number): void {
  const baseTotal = totalRequirements(requirements);
  if (baseTotal <= 0) return;
  const scaled = PHASES.map((phase) => ({
    phase,
    value: requirements[phase] === 0 ? 0 : (requirements[phase] * targetTotal) / baseTotal,
  }));
  const next: TaskRequirements = { design: 0, dev: 0, test: 0 };
  let assigned = 0;
  for (const entry of scaled) {
    next[entry.phase] = Math.floor(entry.value);
    assigned += next[entry.phase];
  }
  const order = scaled
    .filter((entry) => requirements[entry.phase] > 0)
    .toSorted((a, b) => b.value - Math.floor(b.value) - (a.value - Math.floor(a.value)));
  let remainder = targetTotal - assigned;
  let index = 0;
  while (remainder > 0 && order.length > 0) {
    const entry = order[index % order.length]!;
    next[entry.phase] += 1;
    remainder -= 1;
    index += 1;
  }
  for (const phase of PHASES) {
    if (requirements[phase] > 0) requirements[phase] = Math.max(1, next[phase]);
  }
}

export function valueEfficiency(def: TaskDef): number {
  if (def.kind === "incident") return 0.34;
  if (def.reward.effect) return 0.29;
  return def.score >= 6 ? 0.31 : 0.3;
}

export function valueTotalBounds(def: TaskDef): readonly [number, number] {
  if (def.kind === "incident") return [10, 17];
  if (def.reward.effect) return [13, 21];
  return [8, 28];
}

/** 価値（スコア+報酬+効果+罰則）から要求合計を逆算する。 */
export function valueRequirementTotal(def: TaskDef, state: GameState, totalScale = 1): number {
  const base = (taskValue(def) / valueEfficiency(def)) * totalScale;
  const roll = randInt(state, 10);
  const swing = roll < 2 ? -0.05 : roll < 8 ? 0 : 0.05;
  const scale = def.kind === "incident" || def.reward.effect ? 1 : 2;
  const [min, max] = valueTotalBounds(def);
  return Math.min(max, Math.max(min, Math.round(base * (1 + swing * scale))));
}

export function applyValueRequirements(def: TaskDef, state: GameState, totalScale = 1): void {
  redistribute(def.requirements, valueRequirementTotal(def, state, totalScale));
}
