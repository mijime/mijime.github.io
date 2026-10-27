import { drawCards } from "../../hand";
import { pushLog } from "../../log";
import type { CardEffectPlugin } from "./types";

export const drawEffect: CardEffectPlugin<"draw"> = {
  kind: "draw",
  label: (effect) => `コンテキスト+${effect.amount}`,
  describe: (effect) => `山札から${effect.amount}枚ドロー`,
  aiValue: (effect) => effect.amount * 6,
  generationValue: () => 1.5,
  apply({ state, player }, effect) {
    const drawn = drawCards(state, player, effect.amount);
    if (drawn > 0) pushLog(state, `${player.name}: カード効果で${drawn}枚ドロー`, "good");
  },
};
