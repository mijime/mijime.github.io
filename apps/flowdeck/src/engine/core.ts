import { tokenDef } from "../data/tokens";
import { analyticsFor } from "./analytics/state";
import { discardHand, drawCards } from "./hand";
import { pushLog } from "./log";
import { makeSnapshot, playerById, recomputeTeamStats } from "./metrics";
import { BASE_RULES, type RuleSet } from "./rules";
import { applyCardEffect } from "./rules/effects";
import { effectivePlayLevel, phaseForLane, PHASE_LABEL } from "./rules/lanes";
import { computeOutcome } from "./scoring";
import { advanceTasks, canPull, expireTasks, refillOpen } from "./tasks";
import type { GameState } from "./types";

export function pullTask(state: GameState, playerId: string, taskId: string): boolean {
  const player = state.players.find((p) => p.id === playerId);
  const task = state.tasks.find((t) => t.id === taskId && t.lane === "open");
  if (!player || !task || player.actionsLeft <= 0) return false;
  if (!canPull(state)) return false;

  task.lane = "inbox";
  task.ownerId = playerId;
  player.actionsLeft -= 1;
  state.analytics.actions.pull += 1;
  analyticsFor(state, playerId).actions.pull += 1;
  refillOpen(state);
  pushLog(state, `${player.name}: ${task.title} を Ready へ`, "info");
  return true;
}

/** 個人トークンを任意レーンのレベル1作業として置く。アクションは消費しない。 */
export function useToken(
  state: GameState,
  playerId: string,
  token: string,
  taskId: string,
  rules: RuleSet = BASE_RULES,
): boolean {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || (player.tokens[token] ?? 0) <= 0) return false;
  const def = tokenDef(token);
  if (!def) return false;
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) return false;
  const type = phaseForLane(task.lane);
  if (!type) return false;

  player.tokens[token] = (player.tokens[token] ?? 0) - 1;
  task.tokenWork[type] += def.workLevel;
  player.contributed[type].points += def.workLevel;
  state.analytics.tokensUsed += 1;
  analyticsFor(state, playerId).tokensUsed += 1;
  pushLog(
    state,
    `${player.name}: ${def.label} → ${task.title}（${PHASE_LABEL[type]} lv${def.workLevel}）`,
    "good",
  );
  advanceTasks(state, rules);
  return true;
}

export function playCard(
  state: GameState,
  playerId: string,
  cardId: number,
  taskId: string,
  rules: RuleSet = BASE_RULES,
): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.actionsLeft <= 0) return false;

  const handIndex = player.hand.findIndex((card) => card.id === cardId);
  const card = player.hand[handIndex];
  if (!card || card.type === "debt") return false;

  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return false;

  const targetType = phaseForLane(task.lane);
  if (!targetType) return false;

  const playLevel = effectivePlayLevel(card, targetType, rules.balance.allowSubstitution);
  if (playLevel <= 0) return false;

  const playType = targetType;
  player.hand.splice(handIndex, 1);
  task.attached.push({ card, ownerId: playerId, playType, playLevel });
  player.contributed[playType].cards += 1;
  player.contributed[playType].points += playLevel;
  player.actionsLeft -= 1;
  state.analytics.actions.play += 1;
  state.analytics.playByPhase[playType] += 1;
  const playerAnalytics = analyticsFor(state, playerId);
  playerAnalytics.actions.play += 1;
  playerAnalytics.playByPhase[playType] += 1;
  if (card.effect) playerAnalytics.effectPlays += 1;
  if (task.kind === "incident") playerAnalytics.incidentPlays += 1;
  if (card.effect) applyCardEffect(rules.effects, { state, player, task }, card.effect);

  const support = task.ownerId !== playerId;
  const substitute = card.type !== targetType;
  if (support) {
    state.analytics.supportPlays += 1;
    playerAnalytics.supportPlays += 1;
    playerAnalytics.supportPoints += playLevel;
  }
  if (substitute) {
    state.analytics.substitutions += 1;
    playerAnalytics.substitutions += 1;
  }
  const typeLabel = PHASE_LABEL[playType];
  pushLog(
    state,
    `${player.name}: ${typeLabel}lv${playLevel}${substitute ? `（${card.type}lv${card.level}代用）` : ""}${
      support ? " 支援" : ""
    } → ${task.title}`,
    "info",
  );

  advanceTasks(state, rules);
  return true;
}

export function discardCard(state: GameState, playerId: string, cardId: number): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.actionsLeft <= 0) return false;
  const index = player.hand.findIndex((card) => card.id === cardId);
  if (index < 0) return false;
  const [card] = player.hand.splice(index, 1);
  if (!card) return false;
  player.actionsLeft -= 1;
  state.analytics.actions.trash += 1;
  const playerAnalytics = analyticsFor(state, playerId);
  playerAnalytics.actions.trash += 1;
  if (card.type === "debt") playerAnalytics.debtCleaned += 1;
  recomputeTeamStats(state);
  pushLog(state, `${player.name}: ${card.title ?? `${card.type} lv${card.level}`} を廃棄`, "info");
  return true;
}

export function endPlayerTurn(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  const remaining = player.actionsLeft;
  const debt = player.hand.filter((card) => card.type === "debt").length;
  discardHand(player);
  player.actionsLeft = 0;
  if (remaining > 0) {
    state.analytics.actions.pass += 1;
    analyticsFor(state, playerId).actions.pass += 1;
    pushLog(state, `${player.name}: パス（残り${remaining}アクションを放棄）`, "info");
  }
  if (debt > 0) {
    pushLog(state, `${player.name}: 負債カード ${debt}枚を含む手札を捨て札へ`, "bad");
  }
}

/** 次のアクションができるプレイヤーへ。誰もいなければ日末へ */
export function advanceAction(state: GameState): void {
  const count = state.players.length;
  const current = state.activePlayerIndex;
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (current + offset) % count;
    const player = state.players[index];
    if (player && player.actionsLeft > 0) {
      state.activePlayerIndex = index;
      state.phase = index === 0 ? "human" : "ai";
      return;
    }
  }
  state.phase = "roundEnd";
}

/** 1アクション後の共通処理。使い切ったら手札を捨て、次の人へ */
export function finishAction(state: GameState): void {
  const player = state.players[state.activePlayerIndex];
  if (player && player.actionsLeft <= 0) endPlayerTurn(state, player.id);
  advanceAction(state);
}

/** 全員の手札・アクションをリセットして、あなたから1手ずつ始める */
export function startRound(state: GameState, rules: RuleSet = BASE_RULES): void {
  for (const player of state.players) startPlayerTurn(state, player.id, rules);
  state.phase = "human";
  state.activePlayerIndex = 0;
  if ((state.players[0]?.actionsLeft ?? 0) <= 0) advanceAction(state);
}

export function startPlayerTurn(
  state: GameState,
  playerId: string,
  rules: RuleSet = BASE_RULES,
): void {
  const player = playerById(state, playerId);
  discardHand(player);
  const penalty = player.actionPenalty;
  player.actionPenalty = 0;
  player.actionsLeft = Math.max(0, rules.balance.actionsPerTurn - penalty);
  if (penalty > 0) {
    pushLog(
      state,
      `${player.name}: 罰則でアクション -${penalty}（${player.actionsLeft}手で開始）`,
      "bad",
    );
  }
  drawCards(state, player, rules.balance.handSize);
}

export function finishRound(state: GameState, rules: RuleSet = BASE_RULES): void {
  expireTasks(state, rules);
  recomputeTeamStats(state);
  state.metrics.push(makeSnapshot(state));
  pushLog(state, `Day ${state.day} 終了`, "info");
  state.day += 1;

  if (state.day > state.totalDays) {
    state.phase = "over";
    state.outcome = computeOutcome(state, rules);
    pushLog(state, "プロジェクト終了", "good");
    return;
  }

  startRound(state, rules);
  pushLog(state, `Day ${state.day} 開始`, "info");
}
