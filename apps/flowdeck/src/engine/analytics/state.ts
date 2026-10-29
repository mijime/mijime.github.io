import type { GameAnalytics, PlayerAnalytics } from "../types";

export function emptyPlayerAnalytics(): PlayerAnalytics {
  return {
    actions: { play: 0, pull: 0, trash: 0, pass: 0 },
    playByPhase: { design: 0, dev: 0, test: 0 },
    supportPlays: 0,
    supportPoints: 0,
    substitutions: 0,
    tokensUsed: 0,
    incidentPlays: 0,
    effectPlays: 0,
    debtCleaned: 0,
    actionsGained: 0,
    cardsDrawn: 0,
    cardsDiscarded: 0,
    cardsRecovered: 0,
  };
}

export function emptyGameAnalytics(): GameAnalytics {
  return {
    actions: { play: 0, pull: 0, trash: 0, pass: 0 },
    playByPhase: { design: 0, dev: 0, test: 0 },
    supportPlays: 0,
    substitutions: 0,
    tokensUsed: 0,
    actionsGained: 0,
    cardsDrawn: 0,
    cardsDiscarded: 0,
    cardsRecovered: 0,
    debtSources: { risk: 0, incident: 0, other: 0 },
    players: {},
  };
}

export function normalizePlayerAnalytics(
  value: Partial<PlayerAnalytics> | null | undefined,
): PlayerAnalytics {
  const base = emptyPlayerAnalytics();
  if (!value) return base;
  return {
    actions: { ...base.actions, ...value.actions },
    playByPhase: { ...base.playByPhase, ...value.playByPhase },
    supportPlays: value.supportPlays ?? 0,
    supportPoints: value.supportPoints ?? 0,
    substitutions: value.substitutions ?? 0,
    tokensUsed: value.tokensUsed ?? 0,
    incidentPlays: value.incidentPlays ?? 0,
    effectPlays: value.effectPlays ?? 0,
    debtCleaned: value.debtCleaned ?? 0,
    actionsGained: value.actionsGained ?? 0,
    cardsDrawn: value.cardsDrawn ?? 0,
    cardsDiscarded: value.cardsDiscarded ?? 0,
    cardsRecovered: value.cardsRecovered ?? 0,
  };
}

/** 古いセーブの analytics 欠損を埋める。既存の値は保持する。 */
export function normalizeAnalytics(
  value: Partial<GameAnalytics> | null | undefined,
): GameAnalytics {
  const base = emptyGameAnalytics();
  if (!value) return base;
  return {
    actions: { ...base.actions, ...value.actions },
    playByPhase: { ...base.playByPhase, ...value.playByPhase },
    supportPlays: value.supportPlays ?? 0,
    substitutions: value.substitutions ?? 0,
    tokensUsed: value.tokensUsed ?? 0,
    actionsGained: value.actionsGained ?? 0,
    cardsDrawn: value.cardsDrawn ?? 0,
    cardsDiscarded: value.cardsDiscarded ?? 0,
    cardsRecovered: value.cardsRecovered ?? 0,
    debtSources: { ...base.debtSources, ...value.debtSources },
    players: Object.fromEntries(
      Object.entries(value.players ?? {}).map(([id, entry]) => [
        id,
        normalizePlayerAnalytics(entry),
      ]),
    ),
  };
}

/** プレイヤーの計測レコードを取得する。古いセーブでも安全に補う。 */
export function analyticsFor(
  state: { analytics: GameAnalytics },
  playerId: string,
): PlayerAnalytics {
  state.analytics.players ??= {};
  state.analytics.players[playerId] ??= emptyPlayerAnalytics();
  return state.analytics.players[playerId];
}
