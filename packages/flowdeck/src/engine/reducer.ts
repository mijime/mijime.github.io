import { runBotAction } from "./ai";
import {
  advanceAction,
  discardCard,
  endPlayerTurn,
  finishAction,
  finishRound,
  playCard,
  pullTask,
  useToken,
} from "./core";
import { randomSeed } from "./rng";
import { createGame } from "./setup";
import type { Action, GameState } from "./types";

export function reduce(state: GameState, action: Action): GameState {
  if (action.type === "HYDRATE") {
    return action.state;
  }

  if (action.type === "RESTART") {
    return createGame(action.seed ?? randomSeed(), action.days ?? state.totalDays, action.aiCount);
  }

  const s: GameState = structuredClone(state);

  switch (action.type) {
    case "PULL_TASK": {
      if (s.phase !== "human" || s.activePlayerIndex !== 0) return state;
      if (!pullTask(s, s.humanId, action.taskId)) return state;
      finishAction(s);
      return s;
    }

    case "PLAY_CARD": {
      if (s.phase !== "human" || s.activePlayerIndex !== 0) return state;
      if (!playCard(s, s.humanId, action.cardId, action.taskId)) return state;
      finishAction(s);
      return s;
    }

    case "DISCARD_CARD": {
      if (s.phase !== "human" || s.activePlayerIndex !== 0) return state;
      if (!discardCard(s, s.humanId, action.cardId)) return state;
      finishAction(s);
      return s;
    }

    case "USE_TOKEN": {
      if (s.phase !== "human" || s.activePlayerIndex !== 0) return state;
      if (!useToken(s, s.humanId, action.token, action.taskId)) return state;
      return s;
    }

    case "END_TURN": {
      if (s.phase !== "human" || s.activePlayerIndex !== 0) return state;
      endPlayerTurn(s, s.humanId);
      advanceAction(s);
      return s;
    }

    case "RUN_AI_TURN": {
      if (s.phase !== "ai") return state;
      const player = s.players[s.activePlayerIndex];
      if (!player) return state;
      const acted = runBotAction(s, player.id);
      if (!acted) endPlayerTurn(s, player.id);
      finishAction(s);
      return s;
    }

    case "END_ROUND": {
      if (s.phase !== "roundEnd") return state;
      finishRound(s);
      return s;
    }

    default:
      return state;
  }
}

/** シミュレーション用: 人間を含む全員を1アクションずつ1日進める */
export function playBotRound(state: GameState): void {
  let guard = 0;
  while (state.phase !== "roundEnd" && state.phase !== "over" && guard < 500) {
    const player = state.players[state.activePlayerIndex];
    if (!player) break;
    const acted = runBotAction(state, player.id);
    if (!acted) endPlayerTurn(state, player.id);
    finishAction(state);
    guard += 1;
  }
  if (state.phase === "roundEnd") finishRound(state);
}
