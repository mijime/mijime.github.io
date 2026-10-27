import type { CardEffect, CardEffectKind, GameState, PlayerState, TaskCard } from "../../types";

export interface EffectContext {
  state: GameState;
  player: PlayerState;
  task: TaskCard;
}

export interface CardEffectPlugin<K extends CardEffectKind> {
  kind: K;
  /** 短い表示名。例: "コンテキスト+1" */
  label(effect: Extract<CardEffect, { kind: K }>): string;
  /** カードに出す説明。例: "山札から1枚ドロー" */
  describe(effect: Extract<CardEffect, { kind: K }>): string;
  /** プレイ時に状態を変更する */
  apply(ctx: EffectContext, effect: Extract<CardEffect, { kind: K }>): void;
  /** AI の評価値。大きいほど嬉しい */
  aiValue(effect: Extract<CardEffect, { kind: K }>): number;
  /** 生成時の価値。要求合計の算出に使う */
  generationValue(effect: Extract<CardEffect, { kind: K }>): number;
}

export type CardEffectRegistry = {
  [K in CardEffectKind]: CardEffectPlugin<K>;
};
