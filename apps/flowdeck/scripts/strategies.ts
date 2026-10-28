/**
 * 極端な戦略AIの比較実験。
 *
 * 既存の BotOptions はトークン方針しか持たないため、このスクリプトでは
 * 性格3軸に加えて「タスク種別・効果カード・支援/自走・WIP・廃棄」への
 * バイアスを足した戦略ポリシーを直接シミュレーションする。
 *
 * 実行:
 *   pnpm --filter @mijime/flowdeck exec tsx scripts/strategies.ts --runs 1000 --days 10
 */
import {
  playScore,
  pullScore,
  taskValue,
  trashScore,
  type ScoredAction,
  type TokenPolicy,
} from "../src/engine/ai";
import { useBotTokens } from "../src/engine/ai/decisions";
import type { PlayCandidate } from "../src/engine/ai/types";
import {
  discardCard,
  endPlayerTurn,
  finishAction,
  finishRound,
  playCard,
  pullTask,
} from "../src/engine/core";
import { taskSum } from "../src/engine/metrics";
import { chooseAiRelic, chooseAiRelicDiscard, grantRelic, teamRelics } from "../src/engine/relics";
import { BASE_RULES } from "../src/engine/rules";
import { effectivePlayLevel, phaseForLane } from "../src/engine/rules/lanes";
import { createGame } from "../src/engine/setup";
import type {
  CardEffectKind,
  CardInstance,
  GameState,
  PersonalityWeights,
  PlayerState,
  TaskCard,
} from "../src/engine/types";
import { median, quantile } from "./lib/stats";

interface Strategy {
  id: string;
  label: string;
  weights: PersonalityWeights;
  tokenPolicy: TokenPolicy;
  /** プレイ候補への追加点 */
  playBonus?: (candidate: PlayCandidate, state: GameState, player: PlayerState) => number;
  /** タスクを引く候補への追加点 */
  pullBonus?: (task: TaskCard, state: GameState, player: PlayerState) => number;
  /** 廃棄候補への追加点 */
  trashBonus?: (card: CardInstance, state: GameState, player: PlayerState) => number;
  /** 他人のタスクをplayする時の加点 */
  supportBonus?: number;
  /** 自分のタスクをplayする時の加点 */
  ownBonus?: number;
}

const BALANCED_WEIGHTS: PersonalityWeights = { focus: 0.75, greed: -0.6, urgency: 0.75 };

const BALANCED: Strategy = {
  id: "balanced",
  label: "バランス",
  weights: BALANCED_WEIGHTS,
  tokenPolicy: "after-finish",
};

function effectKindBonus(kind: CardEffectKind): number {
  switch (kind) {
    case "action":
      return 45;
    case "draw":
      return 35;
    case "refresh":
    case "cycle":
      return 25;
    case "recover":
      return 20;
    default:
      return 10;
  }
}

function rewardHasEffect(task: TaskCard): boolean {
  return Boolean(task.reward?.effect);
}

const STRATEGIES: Strategy[] = [
  BALANCED,
  {
    id: "finisher",
    label: "仕上げ特化",
    weights: { focus: 3, greed: 0, urgency: 0 },
    tokenPolicy: "after-finish",
  },
  {
    id: "starter",
    label: "着手特化",
    weights: { focus: -3, greed: 0, urgency: 0 },
    tokenPolicy: "immediate",
  },
  {
    id: "greedy",
    label: "高価値特化",
    weights: { focus: 0.2, greed: 3, urgency: 0.2 },
    tokenPolicy: "after-finish",
  },
  {
    id: "hygienist",
    label: "品質・整理特化",
    weights: { focus: 0.7, greed: -3, urgency: 0.4 },
    tokenPolicy: "after-finish",
  },
  {
    id: "firefighter",
    label: "納期消化特化",
    weights: { focus: 0.5, greed: -0.3, urgency: 3 },
    tokenPolicy: "after-finish",
  },
  {
    id: "longterm",
    label: "長期無視",
    weights: { focus: 0.8, greed: 0, urgency: -3 },
    tokenPolicy: "after-finish",
  },
  {
    id: "sniper",
    label: "高スコア狙い",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "after-finish",
    playBonus: (candidate) => candidate.task.score * 10,
    pullBonus: (task) => task.score * 12,
  },
  {
    id: "efficiency",
    label: "効率特化",
    weights: { focus: 0.5, greed: -0.4, urgency: 0.5 },
    tokenPolicy: "after-finish",
    playBonus: (candidate) => taskValue(candidate.task) * 90,
    pullBonus: (task) => taskValue(task) * 110,
  },
  {
    id: "combo",
    label: "効果コンボ",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "after-finish",
    playBonus: (candidate) =>
      (candidate.card.effect
        ? 70 + effectKindBonus(candidate.card.effect.kind)
        : rewardHasEffect(candidate.task)
          ? 25
          : 0) + (candidate.task.kind === "relic" ? -20 : 0),
    pullBonus: (task) => (rewardHasEffect(task) ? 70 : 0) + (task.kind === "relic" ? -20 : 0),
  },
  {
    id: "relic",
    label: "レリック狙い",
    weights: { focus: 1.2, greed: 0.2, urgency: 0.3 },
    tokenPolicy: "after-finish",
    playBonus: (candidate) => (candidate.task.kind === "relic" ? 120 : 0),
    pullBonus: (task) => (task.kind === "relic" ? 150 : 0),
  },
  {
    id: "incident",
    label: "インシデント狙い",
    weights: { focus: 0.4, greed: -1, urgency: 1.2 },
    tokenPolicy: "after-finish",
    playBonus: (candidate) => (candidate.task.kind === "incident" ? 100 : 0),
    pullBonus: (task) => (task.kind === "incident" ? 120 : 0),
  },
  {
    id: "support",
    label: "支援特化",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "after-finish",
    supportBonus: 90,
    ownBonus: -40,
    pullBonus: () => -25,
  },
  {
    id: "solo",
    label: "自走特化",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "after-finish",
    supportBonus: -120,
    ownBonus: 70,
    pullBonus: () => 30,
  },
  {
    id: "hoarder",
    label: "WIP乱獲",
    weights: { focus: 0.1, greed: 1.5, urgency: 1 },
    tokenPolicy: "after-finish",
    pullBonus: () => 120,
  },
  {
    id: "minimalist",
    label: "最小WIP",
    weights: { focus: 2, greed: -0.5, urgency: 0 },
    tokenPolicy: "after-finish",
    pullBonus: () => -130,
  },
  {
    id: "debt-cleaner",
    label: "負債掃除",
    weights: { focus: 0.6, greed: -0.8, urgency: 0.6 },
    tokenPolicy: "after-finish",
    trashBonus: (card) => (card.type === "debt" ? 220 : -80),
    playBonus: (candidate) => (candidate.task.kind === "incident" ? 20 : 0),
  },
  {
    id: "trash-happy",
    label: "廃棄特化",
    weights: { focus: 0.5, greed: -1.5, urgency: 0.5 },
    tokenPolicy: "after-finish",
    trashBonus: (card) =>
      card.type === "debt" ? 160 : card.level <= 2 ? 120 : card.level === 3 ? 10 : -80,
  },
  {
    id: "tokenless",
    label: "トークン温存",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "never",
  },
  {
    id: "token-rush",
    label: "トークン即使用",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "immediate",
  },
  // 極端戦略の弱点（負債・インシデント）を補ったハイブリッド。
  {
    id: "balanced-risk",
    label: "バランス+リスク管理",
    weights: { focus: 0.75, greed: -0.6, urgency: 0.9 },
    tokenPolicy: "after-finish",
    playBonus: (candidate) => (candidate.task.kind === "incident" ? 60 : 0),
    pullBonus: (task) => (task.kind === "incident" ? 80 : 0),
    trashBonus: (card) => (card.type === "debt" ? 180 : -30),
  },
  {
    id: "balanced-effect",
    label: "バランス+効果",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "after-finish",
    playBonus: (candidate) =>
      candidate.card.effect
        ? 40 + effectKindBonus(candidate.card.effect.kind) / 2
        : rewardHasEffect(candidate.task)
          ? 30
          : 0,
    pullBonus: (task) => (rewardHasEffect(task) ? 50 : 0),
  },
  {
    id: "greedy-clean",
    label: "高価値+リスク管理",
    weights: { focus: 0.2, greed: 3, urgency: 0.8 },
    tokenPolicy: "after-finish",
    playBonus: (candidate) => (candidate.task.kind === "incident" ? 60 : 0),
    pullBonus: (task) => (task.kind === "incident" ? 80 : 0),
    trashBonus: (card) => (card.type === "debt" ? 200 : -60),
  },
  {
    id: "efficiency-clean",
    label: "効率+リスク管理",
    weights: { focus: 0.5, greed: -0.4, urgency: 0.7 },
    tokenPolicy: "after-finish",
    playBonus: (candidate) =>
      taskValue(candidate.task) * 80 + (candidate.task.kind === "incident" ? 50 : 0),
    pullBonus: (task) => taskValue(task) * 100 + (task.kind === "incident" ? 70 : 0),
    trashBonus: (card) => (card.type === "debt" ? 180 : -30),
  },
  {
    id: "combo-clean",
    label: "効果コンボ+リスク管理",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "after-finish",
    playBonus: (candidate) =>
      (candidate.card.effect
        ? 70 + effectKindBonus(candidate.card.effect.kind)
        : rewardHasEffect(candidate.task)
          ? 25
          : 0) +
      (candidate.task.kind === "incident" ? 40 : 0) +
      (candidate.task.kind === "relic" ? -20 : 0),
    pullBonus: (task) =>
      (rewardHasEffect(task) ? 70 : 0) +
      (task.kind === "incident" ? 60 : 0) +
      (task.kind === "relic" ? -20 : 0),
    trashBonus: (card) => (card.type === "debt" ? 150 : -20),
  },
  {
    id: "sniper-clean",
    label: "高スコア+リスク管理",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "after-finish",
    playBonus: (candidate) =>
      candidate.task.score * 10 + (candidate.task.kind === "incident" ? 50 : 0),
    pullBonus: (task) => task.score * 12 + (task.kind === "incident" ? 70 : 0),
    trashBonus: (card) => (card.type === "debt" ? 180 : -30),
  },
  {
    id: "minimal-risk",
    label: "最小WIP+リスク管理",
    weights: { focus: 2, greed: -0.5, urgency: 0.4 },
    tokenPolicy: "after-finish",
    playBonus: (candidate) => (candidate.task.kind === "incident" ? 50 : 0),
    pullBonus: (task) => -130 + (task.kind === "incident" ? 70 : 0),
    trashBonus: (card) => (card.type === "debt" ? 150 : -20),
  },
  {
    id: "support-risk",
    label: "支援+リスク管理",
    weights: BALANCED_WEIGHTS,
    tokenPolicy: "after-finish",
    supportBonus: 90,
    ownBonus: -40,
    pullBonus: (task) => -25 + (task.kind === "incident" ? 60 : 0),
    playBonus: (candidate) => (candidate.task.kind === "incident" ? 40 : 0),
    trashBonus: (card) => (card.type === "debt" ? 150 : -20),
  },
];

function scorePlay(
  candidate: PlayCandidate,
  state: GameState,
  player: PlayerState,
  strategy: Strategy,
): number {
  let score = playScore(candidate, player.weights, BASE_RULES);
  score += strategy.playBonus?.(candidate, state, player) ?? 0;
  if (candidate.support) score += strategy.supportBonus ?? 0;
  else score += strategy.ownBonus ?? 0;
  return score;
}

function chooseStrategyAction(
  state: GameState,
  player: PlayerState,
  strategy: Strategy,
): ScoredAction | null {
  const candidates: ScoredAction[] = [];

  for (const task of state.tasks) {
    const type = phaseForLane(task.lane);
    if (!type || !task.ownerId) continue;
    const remaining = task.requirements[type] - taskSum(task, type);
    if (remaining <= 0) continue;

    let best: ScoredAction | null = null;
    for (const card of player.hand) {
      if (card.type === "debt" || card.level <= 0) continue;
      const playLevel = effectivePlayLevel(card, type, BASE_RULES.balance.allowSubstitution);
      if (playLevel <= 0) continue;
      if (card.type !== type && taskSum(task, type) + playLevel < task.requirements[type]) {
        continue;
      }
      const candidate: PlayCandidate = {
        kind: "play",
        card,
        task,
        support: task.ownerId !== player.id,
        type,
        remaining,
        required: task.requirements[type],
      };
      const score = scorePlay(candidate, state, player, strategy);
      if (!best || score > best.score) best = { action: candidate, score };
    }
    if (best) candidates.push(best);
  }

  let bestPull: ScoredAction | null = null;
  for (const task of state.tasks) {
    if (task.lane !== "open") continue;
    const score =
      pullScore(task, state, player, player.weights) +
      (strategy.pullBonus?.(task, state, player) ?? 0);
    if (!bestPull || score > bestPull.score) {
      bestPull = { action: { kind: "pull", task }, score };
    }
  }
  if (bestPull) candidates.push(bestPull);

  let bestTrash: ScoredAction | null = null;
  for (const card of player.hand) {
    const base = trashScore(card, state, player.weights);
    if (!Number.isFinite(base)) continue;
    const score = base + (strategy.trashBonus?.(card, state, player) ?? 0);
    if (score <= 0) continue;
    if (!bestTrash || score > bestTrash.score) {
      bestTrash = { action: { kind: "trash", card }, score };
    }
  }
  if (bestTrash) candidates.push(bestTrash);

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

function resolvePendingRelic(state: GameState): void {
  const pending = state.pendingRelic;
  if (!pending) return;
  const pick = chooseAiRelic(pending.options);
  if (pick) {
    const discard = pending.replace ? chooseAiRelicDiscard(teamRelics(state)) : undefined;
    grantRelic(state, pick, discard);
  }
  state.pendingRelic = null;
}

function runStrategyAction(state: GameState, playerId: string, strategy: Strategy): boolean {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.actionsLeft <= 0) return false;

  const useAfterAction =
    strategy.tokenPolicy === "after" || strategy.tokenPolicy === "after-finish";
  if (!useAfterAction) useBotTokens(state, player, BASE_RULES, strategy.tokenPolicy);

  const decision = chooseStrategyAction(state, player, strategy);
  if (!decision) {
    if (useAfterAction) useBotTokens(state, player, BASE_RULES, strategy.tokenPolicy);
    return false;
  }

  const action = decision.action;
  let acted = false;
  if (action.kind === "play") {
    acted = playCard(state, player.id, action.card.id, action.task.id, BASE_RULES);
  } else if (action.kind === "pull") {
    acted = pullTask(state, player.id, action.task.id);
  } else {
    acted = discardCard(state, player.id, action.card.id);
  }

  if (useAfterAction && player.actionsLeft > 0) {
    useBotTokens(state, player, BASE_RULES, strategy.tokenPolicy);
  }
  resolvePendingRelic(state);
  return acted;
}

function playStrategyRound(
  state: GameState,
  strategyFor: (player: PlayerState, state: GameState) => Strategy,
): void {
  let guard = 0;
  while (state.phase !== "roundEnd" && state.phase !== "over" && guard < 500) {
    const player = state.players[state.activePlayerIndex];
    if (!player) break;
    const strategy = strategyFor(player, state);
    const acted = runStrategyAction(state, player.id, strategy);
    if (!acted) endPlayerTurn(state, player.id);
    finishAction(state);
    resolvePendingRelic(state);
    guard += 1;
  }
  if (state.phase === "roundEnd") finishRound(state, BASE_RULES);
}

interface GameResult {
  finalScore: number;
  stars: number;
  failed: boolean;
  completed: number;
  expired: number;
  teamDebt: number;
  avgWip: number;
  teamEffect: number;
  teamSupport: number;
  focalScore: number;
  focalPoints: number;
  focalCompleted: number;
  focalEffect: number;
  focalSupport: number;
}

function playGame(
  seed: number,
  days: number,
  strategy: Strategy,
  mode: "home" | "mixed",
): GameResult {
  const state = createGame(seed, days, 4, undefined, 0.1, "standard");
  const focalIndex = mode === "mixed" ? seed % state.players.length : -1;
  for (let index = 0; index < state.players.length; index += 1) {
    const player = state.players[index];
    if (!player) continue;
    const assigned = mode === "home" || index === focalIndex ? strategy : BALANCED;
    player.weights = { ...assigned.weights };
  }

  const strategyFor = (player: PlayerState): Strategy => {
    if (mode === "home") return strategy;
    return state.players[focalIndex]?.id === player.id ? strategy : BALANCED;
  };

  let guard = 0;
  while (state.phase !== "over" && guard < days + 5) {
    playStrategyRound(state, strategyFor);
    guard += 1;
  }
  if (!state.outcome) throw new Error(`game did not finish: seed=${seed} days=${days}`);

  const outcome = state.outcome;
  const focal =
    mode === "mixed"
      ? outcome.perPlayer.find((player) => player.id === state.players[focalIndex]?.id)
      : undefined;
  const focalAnalytics = focal ? state.analytics.players[focal.id] : undefined;

  let teamEffect = 0;
  let teamSupport = 0;
  for (const player of outcome.perPlayer) {
    const analytics = state.analytics.players[player.id];
    teamEffect += analytics?.effectPlays ?? 0;
    teamSupport += analytics?.supportPlays ?? 0;
  }

  const focalPoints = focal
    ? focal.contributed.design.points + focal.contributed.dev.points + focal.contributed.test.points
    : 0;

  return {
    finalScore: outcome.finalScore,
    stars: outcome.stars,
    failed: outcome.failed,
    completed: outcome.completed,
    expired: outcome.expired,
    teamDebt: outcome.teamDebt,
    avgWip: outcome.avgWip,
    teamEffect,
    teamSupport,
    focalScore: focal?.score ?? 0,
    focalPoints,
    focalCompleted: focal?.completed ?? 0,
    focalEffect: focalAnalytics?.effectPlays ?? 0,
    focalSupport: focalAnalytics?.supportPlays ?? 0,
  };
}

interface Aggregate {
  n: number;
  scoreMedian: number;
  scoreMean: number;
  scoreP25: number;
  scoreP75: number;
  star3: number;
  fail: number;
  completed: number;
  expired: number;
  debt: number;
  avgWip: number;
  effect: number;
  support: number;
  focalScoreMedian: number;
  focalPoints: number;
  focalCompleted: number;
  focalEffect: number;
  focalSupport: number;
}

function aggregate(results: GameResult[]): Aggregate {
  const scores = results.map((result) => result.finalScore);
  const focalScores = results.map((result) => result.focalScore);
  const n = Math.max(1, results.length);
  return {
    n: results.length,
    scoreMedian: median(scores),
    scoreMean: scores.reduce((sum, value) => sum + value, 0) / n,
    scoreP25: quantile(scores, 0.25),
    scoreP75: quantile(scores, 0.75),
    star3: (results.filter((result) => result.stars === 3).length / n) * 100,
    fail: (results.filter((result) => result.failed).length / n) * 100,
    completed: results.reduce((sum, result) => sum + result.completed, 0) / n,
    expired: results.reduce((sum, result) => sum + result.expired, 0) / n,
    debt: results.reduce((sum, result) => sum + result.teamDebt, 0) / n,
    avgWip: results.reduce((sum, result) => sum + result.avgWip, 0) / n,
    effect: results.reduce((sum, result) => sum + result.teamEffect, 0) / n,
    support: results.reduce((sum, result) => sum + result.teamSupport, 0) / n,
    focalScoreMedian: median(focalScores),
    focalPoints: results.reduce((sum, result) => sum + result.focalPoints, 0) / n,
    focalCompleted: results.reduce((sum, result) => sum + result.focalCompleted, 0) / n,
    focalEffect: results.reduce((sum, result) => sum + result.focalEffect, 0) / n,
    focalSupport: results.reduce((sum, result) => sum + result.focalSupport, 0) / n,
  };
}

function fmt(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

interface Paired {
  winRate: number;
  tieRate: number;
  meanDelta: number;
}

function pairedCompare(
  results: GameResult[],
  baseline: GameResult[],
  value: (result: GameResult) => number,
): Paired {
  let win = 0;
  let tie = 0;
  let delta = 0;
  for (let index = 0; index < results.length; index += 1) {
    const candidate = results[index];
    const reference = baseline[index];
    if (!candidate || !reference) continue;
    const a = value(candidate);
    const b = value(reference);
    if (a > b) win += 1;
    else if (a === b) tie += 1;
    delta += a - b;
  }
  const n = Math.max(1, results.length);
  return { winRate: (win / n) * 100, tieRate: (tie / n) * 100, meanDelta: delta / n };
}

function main(): void {
  const runs = Math.max(1, Number(argValue("--runs", "1000")));
  const days = Math.max(1, Number(argValue("--days", "10")));
  const modeArg = argValue("--mode", "both");
  const modes: Array<"home" | "mixed"> =
    modeArg === "home" ? ["home"] : modeArg === "mixed" ? ["mixed"] : ["home", "mixed"];
  const only = new Set(
    argValue("--only", "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const selected =
    only.size > 0 ? STRATEGIES.filter((strategy) => only.has(strategy.id)) : STRATEGIES;
  const paired = process.argv.includes("--paired");

  for (const mode of modes) {
    console.log(
      `\n## ${days}日 / 5人 / ${runs}シード / ${mode === "home" ? "全員同一" : "1人だけ極端"}戦略\n`,
    );
    const needed = paired
      ? STRATEGIES.filter((strategy) => selected.includes(strategy) || strategy.id === "balanced")
      : selected;
    const resultMap = new Map<string, GameResult[]>();
    for (const strategy of needed) {
      const results: GameResult[] = [];
      for (let seed = 1; seed <= runs; seed += 1) {
        results.push(playGame(seed, days, strategy, mode));
      }
      resultMap.set(strategy.id, results);
    }

    const rows = selected.map((strategy) => {
      const results = resultMap.get(strategy.id) ?? [];
      return { strategy, results, aggregate: aggregate(results) };
    });
    const baselineResults = resultMap.get("balanced");

    if (mode === "home") {
      rows.sort((a, b) => b.aggregate.scoreMedian - a.aggregate.scoreMedian);
      const baseline =
        rows.find((row) => row.strategy.id === "balanced")?.aggregate.scoreMedian ?? 0;
      console.log(
        "| 戦略 | 中央値 | 平均 | 星3 | 失敗 | 完了 | 期限切れ | 負債 | 平均WIP | 効果 | 支援 | Δ中央 |",
      );
      console.log(
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
      );
      for (const row of rows) {
        const a = row.aggregate;
        console.log(
          `| ${row.strategy.label} | ${fmt(a.scoreMedian)} | ${fmt(a.scoreMean)} | ${fmt(a.star3)}% | ${fmt(a.fail)}% | ${fmt(a.completed)} | ${fmt(a.expired)} | ${fmt(a.debt, 2)} | ${fmt(a.avgWip, 2)} | ${fmt(a.effect)} | ${fmt(a.support)} | ${a.scoreMedian - baseline >= 0 ? "+" : ""}${fmt(a.scoreMedian - baseline)} |`,
        );
      }
    } else {
      rows.sort((a, b) => b.aggregate.focalScoreMedian - a.aggregate.focalScoreMedian);
      const baseline =
        rows.find((row) => row.strategy.id === "balanced")?.aggregate.focalScoreMedian ?? 0;
      console.log(
        "| 戦略 | 個人スコア中央 | 個人pt | 個人完了 | チーム中央 | 星3 | 失敗 | 個人効果 | 個人支援 | Δ個人 |",
      );
      console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
      for (const row of rows) {
        const a = row.aggregate;
        console.log(
          `| ${row.strategy.label} | ${fmt(a.focalScoreMedian)} | ${fmt(a.focalPoints)} | ${fmt(a.focalCompleted)} | ${fmt(a.scoreMedian)} | ${fmt(a.star3)}% | ${fmt(a.fail)}% | ${fmt(a.focalEffect)} | ${fmt(a.focalSupport)} | ${a.focalScoreMedian - baseline >= 0 ? "+" : ""}${fmt(a.focalScoreMedian - baseline)} |`,
        );
      }
    }

    if (!paired || !baselineResults) continue;
    console.log("\n### 同一シードでのバランスAIとのペア比較\n");
    if (mode === "home") {
      const pairedRows = rows
        .filter((row) => row.strategy.id !== "balanced")
        .map((row) => ({
          row,
          paired: pairedCompare(row.results, baselineResults, (result) => result.finalScore),
        }))
        .toSorted((a, b) => b.paired.meanDelta - a.paired.meanDelta);
      console.log("| 戦略 | 勝率 | 引分 | Δ平均スコア |");
      console.log("| --- | ---: | ---: | ---: |");
      for (const { row, paired: stats } of pairedRows) {
        console.log(
          `| ${row.strategy.label} | ${fmt(stats.winRate)}% | ${fmt(stats.tieRate)}% | ${stats.meanDelta >= 0 ? "+" : ""}${fmt(stats.meanDelta, 2)} |`,
        );
      }
    } else {
      const pairedRows = rows
        .filter((row) => row.strategy.id !== "balanced")
        .map((row) => ({
          row,
          focal: pairedCompare(row.results, baselineResults, (result) => result.focalScore),
          team: pairedCompare(row.results, baselineResults, (result) => result.finalScore),
        }))
        .toSorted((a, b) => b.team.meanDelta - a.team.meanDelta);
      console.log("| 戦略 | 個人勝率 | 個人Δ平均 | チーム勝率 | チームΔ平均 | チーム引分 |");
      console.log("| --- | ---: | ---: | ---: | ---: | ---: |");
      for (const { row, focal, team } of pairedRows) {
        console.log(
          `| ${row.strategy.label} | ${fmt(focal.winRate)}% | ${focal.meanDelta >= 0 ? "+" : ""}${fmt(focal.meanDelta, 2)} | ${fmt(team.winRate)}% | ${team.meanDelta >= 0 ? "+" : ""}${fmt(team.meanDelta, 2)} | ${fmt(team.tieRate)}% |`,
        );
      }
    }
  }
}

main();
