import { pushLog } from "../../log";
import type { CardEffectPlugin } from "./types";

export const deadlineEffect: CardEffectPlugin<"deadline"> = {
  kind: "deadline",
  label: (effect) => `納期+${effect.amount}`,
  describe: (effect) => `納期 +${effect.amount}`,
  aiValue: (effect) => effect.amount * 7,
  generationValue: () => 1.0,
  apply({ state, player, task }, effect) {
    task.deadline += effect.amount;
    pushLog(state, `${player.name}: 納期トークン +${effect.amount} → ${task.title}`, "good");
  },
};
