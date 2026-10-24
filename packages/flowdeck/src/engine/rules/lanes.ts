import type { CardInstance, GameState, TaskCard, TaskLane } from "../types";

export type Phase = "design" | "dev" | "test";
export type ActiveLane = "inbox" | "wip" | "test";

export const ACTIVE_LANES: readonly ActiveLane[] = ["inbox", "wip", "test"];

const PHASE_BY_LANE: Record<ActiveLane, Phase> = {
  inbox: "design",
  wip: "dev",
  test: "test",
};

export const PHASE_LABEL: Record<Phase, string> = {
  design: "設計",
  dev: "開発",
  test: "テスト",
};

export function isActiveLane(lane: TaskLane): lane is ActiveLane {
  return lane === "inbox" || lane === "wip" || lane === "test";
}

export function phaseForLane(lane: TaskLane): Phase | null {
  return isActiveLane(lane) ? PHASE_BY_LANE[lane] : null;
}

/**
 * 実際に置かれる作業レベル。
 * 基本は同種カードだけ。allowSubstitution=true のときだけ設計/開発を lv1 代用できる。
 * テストは常にテストカード専用で、印刷lvのまま。
 */
export function effectivePlayLevel(
  card: CardInstance,
  phase: Phase,
  allowSubstitution = true,
): number {
  if (card.type === "debt") return 0;
  if (card.type === phase) return card.level;
  if (phase === "test") return 0;
  return allowSubstitution ? 1 : 0;
}

export function activeTasks(state: GameState): TaskCard[] {
  return state.tasks.filter((task) => isActiveLane(task.lane));
}
