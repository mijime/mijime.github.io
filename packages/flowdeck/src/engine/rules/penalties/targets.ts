import type { GameState, PlayerState, TaskCard } from "../../types";

export function penaltyTargets(
  state: GameState,
  task: TaskCard,
  target: "owner" | "all",
): PlayerState[] {
  if (target === "all") return state.players;
  const owner = task.ownerId
    ? state.players.find((player) => player.id === task.ownerId)
    : undefined;
  return owner ? [owner] : state.players;
}
