import type { TaskPenalty, TaskPenaltyKind } from "../../types";
import { debtPenalty } from "./debt";
import { discardHandPenalty } from "./discard-hand";
import { loseActionPenalty } from "./lose-action";
import { teamScorePenalty } from "./team-score";
import type { PenaltyContext, TaskPenaltyPlugin, TaskPenaltyRegistry } from "./types";

export type { PenaltyContext, TaskPenaltyPlugin, TaskPenaltyRegistry } from "./types";

export const TASK_PENALTIES = {
  debt: debtPenalty,
  teamScore: teamScorePenalty,
  discardHand: discardHandPenalty,
  loseAction: loseActionPenalty,
} satisfies TaskPenaltyRegistry;

function pluginOf(
  registry: TaskPenaltyRegistry,
  penalty: TaskPenalty,
): TaskPenaltyPlugin<TaskPenaltyKind> {
  return registry[penalty.kind] as TaskPenaltyPlugin<TaskPenaltyKind>;
}

export function applyPenalty(
  registry: TaskPenaltyRegistry,
  ctx: PenaltyContext,
  penalty: TaskPenalty,
): void {
  pluginOf(registry, penalty).apply(ctx, penalty);
}

export function penaltyLabel(penalty?: TaskPenalty): string | null {
  return penalty ? pluginOf(TASK_PENALTIES, penalty).describe(penalty) : null;
}

export function penaltyGenerationValue(penalty?: TaskPenalty): number {
  return penalty ? pluginOf(TASK_PENALTIES, penalty).generationValue(penalty) : 0;
}
