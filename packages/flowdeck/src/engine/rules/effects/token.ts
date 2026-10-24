import { tokenDef } from "../../../data/tokens";
import { pushLog } from "../../log";
import type { CardEffectPlugin } from "./types";

export const tokenEffect: CardEffectPlugin<"token"> = {
  kind: "token",
  label: (effect) => `${tokenDef(effect.token)?.short ?? effect.token}トークン+${effect.amount}`,
  describe: (effect) =>
    `${tokenDef(effect.token)?.label ?? effect.token} +${effect.amount}（アクションなしでlv1作業）`,
  aiValue: (effect) => effect.amount * 8,
  generationValue: () => 1.3,
  apply({ state, player }, effect) {
    const def = tokenDef(effect.token);
    player.tokens[effect.token] = (player.tokens[effect.token] ?? 0) + effect.amount;
    pushLog(state, `${player.name}: ${def?.label ?? effect.token} +${effect.amount}`, "good");
  },
};
