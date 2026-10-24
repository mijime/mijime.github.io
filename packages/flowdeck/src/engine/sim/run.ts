import { runBotAction, type ScoredAction } from "../ai";
import { endPlayerTurn, finishAction, finishRound } from "../core";
import { BASE_RULES, type RuleSet } from "../rules";
import type { GameState } from "../types";

/** シミュレーション用: 人間を含む全員を1アクションずつ1日進める */
export function playBotRound(
  state: GameState,
  onDecision?: (decision: ScoredAction) => void,
  rules: RuleSet = BASE_RULES,
): void {
  let guard = 0;
  while (state.phase !== "roundEnd" && state.phase !== "over" && guard < 500) {
    const player = state.players[state.activePlayerIndex];
    if (!player) break;
    const acted = runBotAction(state, player.id, rules, onDecision);
    if (!acted) endPlayerTurn(state, player.id);
    finishAction(state);
    guard += 1;
  }
  if (state.phase === "roundEnd") finishRound(state, rules);
}
