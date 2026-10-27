import { recomputeTeamStats } from "../../metrics";
import { pushLog } from "../../log";
import type { CardEffectPlugin } from "./types";

export const debtCleanEffect: CardEffectPlugin<"debt-clean"> = {
  kind: "debt-clean",
  label: (effect) => `技術的負債-${effect.amount}`,
  describe: (effect) => `負債カードを${effect.amount}枚除去`,
  aiValue: (effect) => effect.amount * 7,
  generationValue: () => 1.2,
  apply({ state, player }, effect) {
    let removed = 0;
    for (const zone of [player.hand, player.deck, player.discard]) {
      const index = zone.findIndex((candidate) => candidate.type === "debt");
      if (index >= 0) {
        zone.splice(index, 1);
        removed += 1;
        if (removed >= effect.amount) break;
      }
    }
    if (removed > 0) {
      recomputeTeamStats(state);
      pushLog(state, `${player.name}: カード効果で負債 ${removed}枚を除去`, "good");
    }
  },
};
