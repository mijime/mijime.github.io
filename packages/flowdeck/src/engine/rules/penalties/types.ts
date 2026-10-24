import type { GameState, TaskCard, TaskPenalty, TaskPenaltyKind } from "../../types";

export interface PenaltyContext {
  state: GameState;
  task: TaskCard;
}

export interface TaskPenaltyPlugin<K extends TaskPenaltyKind> {
  kind: K;
  apply(ctx: PenaltyContext, penalty: Extract<TaskPenalty, { kind: K }>): void;
  describe(penalty: Extract<TaskPenalty, { kind: K }>): string;
  /** 生成時の価値。要求合計の算出に使う */
  generationValue(penalty: Extract<TaskPenalty, { kind: K }>): number;
}

export type TaskPenaltyRegistry = {
  [K in TaskPenaltyKind]: TaskPenaltyPlugin<K>;
};
