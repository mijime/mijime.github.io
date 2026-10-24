import { discardCard, playCard, pullTask } from "../core";
import { BASE_RULES, type RuleSet } from "../rules";
import type { GameState } from "../types";
import { chooseBotActionScored, useBotTokens } from "./decisions";
import type { ScoredAction } from "./types";

export type { ScoredAction } from "./types";
export { chooseBotActionScored } from "./decisions";
export { taskValue, urgencyOf } from "./features";
export { playScore, pullScore, trashScore } from "./scoring";

export function runBotAction(
  state: GameState,
  playerId: string,
  rules: RuleSet = BASE_RULES,
  onDecision?: (decision: ScoredAction) => void,
): boolean {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.actionsLeft <= 0) return false;
  // LLMトークンはアクションを消費しないので、行動前に使い切る。
  useBotTokens(state, player, rules);
  // 行動は focus / greed / urgency の3軸だけで決める。
  const decision = chooseBotActionScored(state, player, rules);
  if (!decision) return false;
  onDecision?.(decision);
  const action = decision.action;
  if (action.kind === "play") {
    return playCard(state, player.id, action.card.id, action.task.id, rules);
  }
  if (action.kind === "pull") return pullTask(state, player.id, action.task.id);
  return discardCard(state, player.id, action.card.id);
}
