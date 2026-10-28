import { analyticsFor } from "../../analytics/state";
import { pushLog } from "../../log";
import type { CardEffectPlugin } from "./types";

/** 捨て札からカードを回収して手札に戻す。 */
export const recoverEffect: CardEffectPlugin<"recover"> = {
  kind: "recover",
  label: (effect) => `回収+${effect.amount}`,
  describe: (effect) => `捨て札から${effect.amount}枚を手札に戻す`,
  aiValue: (effect) => effect.amount * 5,
  generationValue: () => 1.2,
  apply({ state, player }, effect) {
    const picks = player.discard
      .filter((card) => card.type !== "debt")
      .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.level - a.level)
      .slice(0, effect.amount);
    if (picks.length === 0) return;
    const ids = new Set(picks.map((card) => card.id));
    player.discard = player.discard.filter((card) => !ids.has(card.id));
    player.hand.push(...picks);
    state.analytics.cardsRecovered += picks.length;
    analyticsFor(state, player.id).cardsRecovered += picks.length;
    pushLog(state, `${player.name}: 捨て札から${picks.length}枚を回収`, "good");
  },
};
