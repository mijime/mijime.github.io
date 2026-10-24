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
import { BASE_RULES, type RuleSet } from "./rules";
import { createGame } from "./setup";
import type { Action, GameState } from "./types";

export { playBotRound } from "./sim/run";

export function reduce(state: GameState, action: Action, rules: RuleSet = BASE_RULES): GameState {
  if (action.type === "HYDRATE") {
    return action.state;
  }

  if (action.type === "RESTART") {
    return createGame(
      action.seed ?? randomSeed(),
      action.days ?? state.totalDays,
      action.aiCount,
      rules,
      action.generationSwing ?? state.generationSwing,
    );
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
      if (!playCard(s, s.humanId, action.cardId, action.taskId, rules)) return state;
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
      if (!useToken(s, s.humanId, action.token, action.taskId, rules)) return state;
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
      const acted = runBotAction(s, player.id, rules);
      if (!acted) endPlayerTurn(s, player.id);
      finishAction(s);
      return s;
    }

    case "AUTO_STEP": {
      // テスト用: 手番のプレイヤー（人間を含む）をボットとして1手進める
      if (s.phase === "over" || s.phase === "roundEnd") return state;
      const player = s.players[s.activePlayerIndex];
      if (!player) return state;
      const acted = runBotAction(s, player.id, rules);
      if (!acted) endPlayerTurn(s, player.id);
      finishAction(s);
      return s;
    }

    case "END_ROUND": {
      if (s.phase !== "roundEnd") return state;
      finishRound(s, rules);
      return s;
    }

    default:
      return state;
  }
}
