import { discardCard, playCard, pullTask, useToken } from "./core";
import { playerWip, taskSum } from "./metrics";
import { BASE_RULES, type RuleSet } from "./rules";
import { effectAiValue } from "./rules/effects";
import { activeTasks, effectivePlayLevel, phaseForLane, type Phase } from "./rules/lanes";
import type { CardInstance, GameState, PersonalityWeights, PlayerState, TaskCard } from "./types";

type PlayType = Phase;

interface PlayCandidate {
  kind: "play";
  card: CardInstance;
  task: TaskCard;
  support: boolean;
  type: PlayType;
  remaining: number;
  required: number;
}

type PullCandidate = { kind: "pull"; task: TaskCard };
type TrashCandidate = { kind: "trash"; card: CardInstance };
type BotAction = PlayCandidate | PullCandidate | TrashCandidate;
export type ScoredAction = { action: BotAction; score: number };

const PLAY_BASE = 60;
const PULL_BASE = 55;
const TRASH_BASE = 0;
const FOCUS_SCALE = 45;
const GREED_SCALE = 50;
const URGENCY_SCALE = 50;
/** 性格に関係なく、納期が近いタスクを最低限は優先する */
const URGENCY_BASE = 24;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function activeCount(state: GameState): number {
  return activeTasks(state).length;
}

function urgencyOf(task: TaskCard): number {
  return clamp01((task.tokens + 1) / (task.deadline + 1));
}

function taskValue(task: TaskCard): number {
  const raw = task.score + task.reward.level + (task.reward.effect ? 1 : 0);
  const requirement = task.requirements.design + task.requirements.dev + task.requirements.test;
  const absolute = clamp01(raw / 11);
  // 低スコアでも要求が軽いタスクを拾えるように、要求量あたりの効率を主に見る
  const efficiency = clamp01(raw / Math.max(1, requirement) / 0.5);
  const incident = task.kind === "incident" ? 0.15 : 0;
  return clamp01(efficiency * 0.6 + absolute * 0.4 + incident);
}

function playValue(task: TaskCard, card: CardInstance, rules: RuleSet): number {
  const raw = taskValue(task);
  return clamp01(raw * 0.8 + clamp01(effectAiValue(rules.effects, card.effect) / 30) * 0.2);
}

function playFeature(candidate: PlayCandidate, rules: RuleSet): number {
  const after =
    taskSum(candidate.task, candidate.type) +
    effectivePlayLevel(candidate.card, candidate.type, rules.balance.allowSubstitution);
  if (after >= candidate.required) return 1;
  return clamp01(after / Math.max(1, candidate.required));
}

function pullFeature(state: GameState, player: PlayerState): number {
  const vacancy = 1 - Math.min(1, activeCount(state) / 6);
  const own = playerWip(state, player.id);
  return clamp01(vacancy * (1 - Math.min(1, own / 4)));
}

function playScore(candidate: PlayCandidate, weights: PersonalityWeights, rules: RuleSet): number {
  const feature = playFeature(candidate, rules);
  const quality = candidate.type === "test" ? 0.5 + 0.5 * feature : Math.min(0.2, feature * 0.2);
  const hygiene = Math.max(0, -weights.greed);
  const urgency = urgencyOf(candidate.task);
  const playLevel = effectivePlayLevel(
    candidate.card,
    candidate.type,
    rules.balance.allowSubstitution,
  );
  const completion = playLevel >= candidate.remaining ? 1 : 0.35;

  return (
    PLAY_BASE +
    weights.focus * FOCUS_SCALE * feature +
    Math.max(0, weights.greed) * GREED_SCALE * playValue(candidate.task, candidate.card, rules) +
    hygiene * 12 * quality +
    (candidate.task.kind === "incident" ? 20 : 0) +
    weights.urgency * URGENCY_SCALE * urgency * completion +
    URGENCY_BASE * urgency * completion
  );
}

function pullScore(
  task: TaskCard,
  state: GameState,
  player: PlayerState,
  weights: PersonalityWeights,
): number {
  const own = playerWip(state, player.id);

  return (
    PULL_BASE -
    weights.focus * FOCUS_SCALE * pullFeature(state, player) +
    Math.max(0, weights.greed) * 40 * taskValue(task) +
    weights.urgency * 30 * urgencyOf(task) +
    (task.kind === "incident" ? 20 : 0) -
    own * 14
  );
}

function trashScore(card: CardInstance, state: GameState, weights: PersonalityWeights): number {
  // タスク報酬カードは AI の性格に関係なく捨てない
  if (card.score !== undefined || card.title) return Number.NEGATIVE_INFINITY;
  const hygiene = Math.max(0, -weights.greed);
  const debtPressure = state.teamDebt / Math.max(1, state.rules.debtLimit);

  // 負債は全AIが片付ける（能力の下限）。低レベルカードの廃棄だけ性格に任せる。
  if (card.type === "debt") {
    return 80 + debtPressure * 20 + hygiene * 10;
  }
  if (card.level > 3) return Number.NEGATIVE_INFINITY;
  const feature = (4 - card.level) / 3;
  return TRASH_BASE + hygiene * 70 * feature;
}

function bestPlay(
  player: PlayerState,
  task: TaskCard,
  type: PlayType,
  weights: PersonalityWeights,
  rules: RuleSet,
): ScoredAction | null {
  const remaining = task.requirements[type] - taskSum(task, type);
  if (remaining <= 0) return null;

  let best: ScoredAction | null = null;
  for (const card of player.hand) {
    if (card.type === "debt" || card.level <= 0) continue;
    const playLevel = effectivePlayLevel(card, type, rules.balance.allowSubstitution);
    if (playLevel <= 0) continue;
    // 代用ありルールでは lv1 扱い。フェーズを完了できない代用はカードの無駄なので避ける。
    if (card.type !== type && taskSum(task, type) + playLevel < task.requirements[type]) continue;
    const candidate: PlayCandidate = {
      kind: "play",
      card,
      task,
      support: task.ownerId !== player.id,
      type,
      remaining,
      required: task.requirements[type],
    };
    const score = playScore(candidate, weights, rules);
    if (!best || score > best.score) best = { action: candidate, score };
  }
  return best;
}

function bestPull(
  state: GameState,
  player: PlayerState,
  weights: PersonalityWeights,
): ScoredAction | null {
  let best: ScoredAction | null = null;
  for (const task of state.tasks) {
    if (task.lane !== "open") continue;
    const score = pullScore(task, state, player, weights);
    if (!best || score > best.score) best = { action: { kind: "pull", task }, score };
  }
  return best;
}

function bestTrash(
  state: GameState,
  player: PlayerState,
  weights: PersonalityWeights,
): ScoredAction | null {
  let best: ScoredAction | null = null;
  for (const card of player.hand) {
    const score = trashScore(card, state, weights);
    if (!Number.isFinite(score) || score <= 0) continue;
    if (!best || score > best.score) best = { action: { kind: "trash", card }, score };
  }
  return best;
}

function chooseBotActionScored(
  state: GameState,
  player: PlayerState,
  rules: RuleSet,
): ScoredAction | null {
  const weights = player.weights;
  const candidates: ScoredAction[] = [];

  for (const task of state.tasks) {
    const type = phaseForLane(task.lane);
    if (!type || !task.ownerId) continue;
    const play = bestPlay(player, task, type, weights, rules);
    if (play) candidates.push(play);
  }

  const pull = bestPull(state, player, weights);
  if (pull) candidates.push(pull);
  const trash = bestTrash(state, player, weights);
  if (trash) candidates.push(trash);

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

function bestTokenTask(state: GameState): TaskCard | null {
  let best: TaskCard | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const task of state.tasks) {
    const type = phaseForLane(task.lane);
    if (!type) continue;
    const remaining = task.requirements[type] - taskSum(task, type);
    if (remaining <= 0) continue;
    const score =
      (remaining <= 1 ? 40 : 0) +
      task.score * 10 +
      (task.tokens / Math.max(1, task.deadline)) * 20 +
      (task.kind === "incident" ? 20 : 0);
    if (score > bestScore) {
      best = task;
      bestScore = score;
    }
  }
  return best;
}

function useBotTokens(state: GameState, player: PlayerState, rules: RuleSet): void {
  while ((player.tokens.mi ?? 0) > 0) {
    const task = bestTokenTask(state);
    if (!task) break;
    if (!useToken(state, player.id, "mi", task.id, rules)) break;
  }
}

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
