import { analyticsFor } from "../../analytics/state";
import { drawCards } from "../../hand";
import { pushLog } from "../../log";
import type { CardInstance } from "../../types";
import type { CardEffectPlugin } from "./types";

/** 山札を掘って手札を入れ替える。捨てるのは低レベルの基本カードか負債。 */
export const cycleEffect: CardEffectPlugin<"cycle"> = {
  kind: "cycle",
  label: (effect) => `循環+${effect.draw}`,
  describe: (effect) =>
    `${effect.draw}枚引き、低レベルのカードを${effect.discard}枚捨てる（報酬カードは捨てない）`,
  aiValue: (effect) => effect.draw * 5,
  generationValue: () => 1.3,
  apply({ state, player }, effect) {
    const drawn = drawCards(state, player, effect.draw);
    if (drawn > 0) {
      state.analytics.cardsDrawn += drawn;
      analyticsFor(state, player.id).cardsDrawn += drawn;
      pushLog(state, `${player.name}: 循環で${drawn}枚ドロー`, "good");
    }

    let discarded = 0;
    for (let index = 0; index < effect.discard; index += 1) {
      let card: CardInstance | undefined;
      for (const candidate of player.hand) {
        if (candidate.type === "debt" || candidate.score !== undefined) continue;
        if (!card || candidate.level < card.level) card = candidate;
      }
      card ??= player.hand.find((candidate) => candidate.type === "debt");
      if (!card) break;
      const handIndex = player.hand.findIndex((candidate) => candidate.id === card.id);
      if (handIndex < 0) break;
      player.hand.splice(handIndex, 1);
      player.discard.push(card);
      discarded += 1;
    }
    if (discarded > 0) {
      state.analytics.cardsDiscarded += discarded;
      analyticsFor(state, player.id).cardsDiscarded += discarded;
      pushLog(state, `${player.name}: 循環で${discarded}枚を捨て札へ`, "info");
    }
  },
};
