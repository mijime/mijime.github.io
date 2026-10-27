import type { GameState, TaskDef, TaskKind } from "../types";

/** 通常タスクの要求量を ±10% 揺らす既定値。effect/incident は半分の振幅。 */
export const DEFAULT_GENERATION_SWING = 0.1;
/** 通常タスクで 0.8〜1.2 倍になる上限。 */
export const MAX_GENERATION_SWING = 0.2;

export function normalizeGenerationSwing(value: number | undefined): number {
  if (value === undefined) return DEFAULT_GENERATION_SWING;
  if (!Number.isFinite(value) || value < 0 || value > MAX_GENERATION_SWING) {
    throw new Error(`generationSwing must be between 0 and ${MAX_GENERATION_SWING}: ${value}`);
  }
  return value;
}

export interface GenerationContext {
  state: GameState;
  kind: TaskKind;
  swing: number;
  randInt(max: number): number;
}

export interface TaskGenerationModifier {
  id: string;
  apply(def: TaskDef, ctx: GenerationContext): void;
}

/**
 * base は全タスク共通の生成（名前・要求の揺らし）。
 * modifiers は順番に適用される追加補正で、空配列なら補正なし。
 * swing は要求量の揺らし幅。0 で固定、0.2 で通常タスクが 0.8〜1.2 倍になる。
 */
export interface TaskGenerationPolicy {
  base(def: TaskDef, ctx: GenerationContext): void;
  modifiers: readonly TaskGenerationModifier[];
  swing?: number;
  /** テンプレートを使わず、プール全体を生成する場合 */
  create?(state: GameState, swing: number): TaskDef[];
}
