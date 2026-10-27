import { discardCard, playCard, pullTask } from "../core";
import { BASE_RULES, type RuleSet } from "../rules";
import type { GameState } from "../types";
import { chooseBotActionScored, useBotTokens } from "./decisions";
import { DEFAULT_BOT_OPTIONS, type BotOptions, type ScoredAction } from "./types";

export type { BotOptions, ScoredAction, TokenPolicy } from "./types";
export { chooseBotActionScored } from "./decisions";
export { taskValue, urgencyOf } from "./features";
export { playScore, pullScore, trashScore } from "./scoring";

export function runBotAction(
  state: GameState,
  playerId: string,
  rules: RuleSet = BASE_RULES,
  onDecision?: (decision: ScoredAction) => void,
  options: BotOptions = DEFAULT_BOT_OPTIONS,
): boolean {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.actionsLeft <= 0) return false;
  const policy = options.tokenPolicy;
  const useAfterAction = policy === "after" || policy === "after-finish";
  // 即時/仕上げ系は行動前に、after系は行動後にトークンを使う。
  if (!useAfterAction) useBotTokens(state, player, rules, policy);
  // 行動は focus / greed / urgency の3軸だけで決める。
  const decision = chooseBotActionScored(state, player, rules);
  if (!decision) {
    if (useAfterAction) useBotTokens(state, player, rules, policy);
    return false;
  }
  onDecision?.(decision);
  const action = decision.action;
  let acted = false;
  if (action.kind === "play") {
    acted = playCard(state, player.id, action.card.id, action.task.id, rules);
  } else if (action.kind === "pull") {
    acted = pullTask(state, player.id, action.task.id);
  } else {
    acted = discardCard(state, player.id, action.card.id);
  }
  // 最後のアクション後はUI同様に手番が終わるため、トークンは使わない。
  if (useAfterAction && player.actionsLeft > 0) {
    useBotTokens(state, player, rules, policy);
  }
  return acted;
}
