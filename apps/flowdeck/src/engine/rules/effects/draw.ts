import { analyticsFor } from "../../analytics/state";
import { drawCards } from "../../hand";
import { pushLog } from "../../log";
import type { CardEffectPlugin } from "./types";

export const drawEffect: CardEffectPlugin<"draw"> = {
  kind: "draw",
  label: (effect) => `コンテキスト+${effect.amount}`,
  describe: (effect) => `山札から${effect.amount}枚ドロー`,
  aiValue: (effect) => effect.amount * 6,
  generationValue: (effect) => 1.5 + (effect.amount - 1) * 1.0,
  apply({ state, player }, effect) {
    const drawn = drawCards(state, player, effect.amount);
    if (drawn > 0) {
      state.analytics.cardsDrawn += drawn;
      analyticsFor(state, player.id).cardsDrawn += drawn;
      pushLog(state, `${player.name}: カード効果で${drawn}枚ドロー`, "good");
    }
  },
};
