import type { CardEffect, CardInstance, CardType } from "../engine/types";

export interface CardSpec {
  type: CardType;
  level: number;
  effect?: CardEffect;
}

/** 初期デッキ: 設計/開発/テストの lv2×2, lv3, lv4 */
export const INITIAL_DECK_SPECS: CardSpec[] = [
  { type: "design", level: 2 },
  { type: "design", level: 2 },
  { type: "design", level: 3 },
  { type: "design", level: 4 },
  { type: "dev", level: 2 },
  { type: "dev", level: 2 },
  { type: "dev", level: 3 },
  { type: "dev", level: 4 },
  { type: "test", level: 2 },
  { type: "test", level: 2 },
  { type: "test", level: 3 },
  { type: "test", level: 4 },
];

/** 初期デッキの合計枚数（12枚） */
export const INITIAL_DECK_SIZE = INITIAL_DECK_SPECS.length;

export function makeCard(
  id: number,
  type: CardType,
  level: number,
  effect?: CardEffect,
): CardInstance {
  return { id, type, level, effect };
}
