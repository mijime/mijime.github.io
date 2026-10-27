import { pushLog } from "../../log";
import type { CardEffectPlugin } from "./types";

export const actionEffect: CardEffectPlugin<"action"> = {
  kind: "action",
  label: (effect) => `並列実行+${effect.amount}`,
  describe: (effect) => `このターンのアクション +${effect.amount}`,
  aiValue: (effect) => effect.amount * 9,
  generationValue: () => 1.5,
  apply({ state, player }, effect) {
    player.actionsLeft += effect.amount;
    pushLog(state, `${player.name}: カード効果でアクション +${effect.amount}`, "good");
  },
};
