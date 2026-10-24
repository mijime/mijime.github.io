import type { GameState, TaskDef, TaskKind } from "../types";

export interface GenerationContext {
  state: GameState;
  kind: TaskKind;
  randInt(max: number): number;
}

export interface TaskGenerationModifier {
  id: string;
  apply(def: TaskDef, ctx: GenerationContext): void;
}

/**
 * base は全タスク共通の生成（名前・要求の揺らし）。
 * modifiers は順番に適用される追加補正で、空配列なら補正なし。
 */
export interface TaskGenerationPolicy {
  base(def: TaskDef, ctx: GenerationContext): void;
  modifiers: readonly TaskGenerationModifier[];
  /** テンプレートを使わず、プール全体を生成する場合 */
  create?(state: GameState): TaskDef[];
}
