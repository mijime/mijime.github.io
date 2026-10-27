import { useToken } from "../core";
import { taskSum } from "../metrics";
import type { RuleSet } from "../rules";
import { effectivePlayLevel, phaseForLane } from "../rules/lanes";
import type { GameState, PersonalityWeights, PlayerState, TaskCard } from "../types";
import { pullScore, playScore, trashScore } from "./scoring";
import type { PlayCandidate, ScoredAction, PlayType, TokenPolicy } from "./types";

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

export function chooseBotActionScored(
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

function bestTokenTask(state: GameState, finishOnly: boolean): TaskCard | null {
  let best: TaskCard | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const task of state.tasks) {
    const type = phaseForLane(task.lane);
    if (!type) continue;
    const remaining = task.requirements[type] - taskSum(task, type);
    if (remaining <= 0) continue;
    if (finishOnly && remaining > 1) continue;
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

export function useBotTokens(
  state: GameState,
  player: PlayerState,
  rules: RuleSet,
  policy: TokenPolicy = "immediate",
): void {
  if (policy === "never") return;
  const finishOnly = policy === "finish" || policy === "after-finish";
  while ((player.tokens.mi ?? 0) > 0) {
    const task = bestTokenTask(state, finishOnly);
    if (!task) break;
    if (!useToken(state, player.id, "mi", task.id, rules)) break;
  }
}
