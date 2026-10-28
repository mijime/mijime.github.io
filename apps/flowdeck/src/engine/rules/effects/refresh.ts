import { analyticsFor } from "../../analytics/state";
import { discardHand, drawCards } from "../../hand";
import { pushLog } from "../../log";
import type { CardEffectPlugin } from "./types";

/** 全員の手札を捨てて引き直す。手数を作るためのチーム効果。 */
export const refreshEffect: CardEffectPlugin<"refresh"> = {
  kind: "refresh",
  label: (effect) => `全員リセット+${effect.draw}`,
  describe: (effect) => `全員の手札を捨てて${effect.draw}枚ドロー`,
  aiValue: (effect) => effect.draw * 4,
  generationValue: () => 1.6,
  apply({ state, player }, effect) {
    for (const target of state.players) {
      const discarded = target.hand.length;
      discardHand(target);
      const drawn = drawCards(state, target, effect.draw);
      state.analytics.cardsDrawn += drawn;
      state.analytics.cardsDiscarded += discarded;
      const analytics = analyticsFor(state, target.id);
      analytics.cardsDrawn += drawn;
      analytics.cardsDiscarded += discarded;
    }
    pushLog(state, `${player.name}: 全員の手札を捨てて${effect.draw}枚ドロー`, "good");
  },
};
