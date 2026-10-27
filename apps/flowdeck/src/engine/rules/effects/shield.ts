import { pushLog } from "../../log";
import type { CardEffectPlugin } from "./types";

export const shieldEffect: CardEffectPlugin<"shield"> = {
  kind: "shield",
  label: (effect) => `エラーバジェット+${effect.amount}`,
  describe: (effect) => `次に受ける負債を${effect.amount}枚防ぐ`,
  aiValue: (effect) => effect.amount * 8,
  generationValue: () => 1.2,
  apply({ state, player }, effect) {
    player.shields = (player.shields ?? 0) + effect.amount;
    pushLog(state, `${player.name}: シールド +${effect.amount}`, "good");
  },
};
