import { playerWip, taskSum } from "../metrics";
import { effectivePlayLevel } from "../rules/lanes";
import type { RuleSet } from "../rules";
import { effectAiValue } from "../rules/effects";
import { activeTasks } from "../rules/lanes";
import type { CardInstance, GameState, PlayerState, TaskCard } from "../types";
import type { PlayCandidate } from "./types";

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function activeCount(state: GameState): number {
  return activeTasks(state).length;
}

export function urgencyOf(task: TaskCard): number {
  return clamp01((task.tokens + 1) / (task.deadline + 1));
}

export function taskValue(task: TaskCard): number {
  const raw = task.score + (task.reward?.level ?? 0) + (task.reward?.effect ? 1 : 0);
  const requirement = task.requirements.design + task.requirements.dev + task.requirements.test;
  const absolute = clamp01(raw / 11);
  // 低スコアでも要求が軽いタスクを拾えるように、要求量あたりの効率を主に見る
  const efficiency = clamp01(raw / Math.max(1, requirement) / 0.5);
  const incident = task.kind === "incident" ? 0.15 : 0;
  return clamp01(efficiency * 0.6 + absolute * 0.4 + incident);
}

export function playValue(task: TaskCard, card: CardInstance, rules: RuleSet): number {
  const raw = taskValue(task);
  return clamp01(raw * 0.8 + clamp01(effectAiValue(rules.effects, card.effect) / 30) * 0.2);
}

export function playFeature(candidate: PlayCandidate, rules: RuleSet): number {
  const after =
    taskSum(candidate.task, candidate.type) +
    effectivePlayLevel(candidate.card, candidate.type, rules.balance.allowSubstitution);
  if (after >= candidate.required) return 1;
  return clamp01(after / Math.max(1, candidate.required));
}

export function pullFeature(state: GameState, player: PlayerState): number {
  const vacancy = 1 - Math.min(1, activeCount(state) / 6);
  const own = playerWip(state, player.id);
  return clamp01(vacancy * (1 - Math.min(1, own / 4)));
}
