import { addCardToDiscard } from "./hand";
import { pushLog } from "./log";
import { recomputeTeamStats } from "./metrics";
import type { GameState, PlayerState } from "./types";

export function addDebt(state: GameState, player: PlayerState, amount: number): void {
  const shielded = Math.min(player.shields ?? 0, amount);
  if (shielded > 0) {
    player.shields = (player.shields ?? 0) - shielded;
    amount -= shielded;
    pushLog(state, `${player.name}: シールドで負債 ${shielded}枚を防いだ`, "good");
  }
  if (amount <= 0) return;
  addCardToDiscard(state, player, "debt", 0, amount);
  recomputeTeamStats(state);
  pushLog(state, `${player.name} に負債 +${amount}`, "bad");
}
