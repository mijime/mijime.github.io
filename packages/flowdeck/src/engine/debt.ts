import { addCardToDiscard } from "./hand";
import { pushLog } from "./log";
import { recomputeTeamStats } from "./metrics";
import type { GameState, PlayerState } from "./types";

/**
 * プレイヤーに負債カードを追加する。
 * 戻り値はシールドで防がれた後に実際に増えた負債枚数。
 */
export function addDebt(
  state: GameState,
  player: PlayerState,
  amount: number,
  source: "risk" | "incident" | "other" = "other",
): number {
  const shielded = Math.min(player.shields ?? 0, amount);
  if (shielded > 0) {
    player.shields = (player.shields ?? 0) - shielded;
    amount -= shielded;
    pushLog(state, `${player.name}: シールドで負債 ${shielded}枚を防いだ`, "good");
  }
  if (amount <= 0) return 0;
  addCardToDiscard(state, player, "debt", 0, amount);
  state.analytics.debtSources[source] += amount;
  recomputeTeamStats(state);
  pushLog(state, `${player.name} に負債 +${amount}`, "bad");
  return amount;
}
