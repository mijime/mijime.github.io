import type {
  CardInstance,
  Contribution,
  DaySnapshot,
  GameState,
  PlayerState,
  TaskCard,
  TaskLane,
} from "./types";
import { activeTasks } from "./rules/lanes";

export function tasksInLane(state: GameState, playerId: string, lane: TaskLane): TaskCard[] {
  return state.tasks.filter((task) => task.ownerId === playerId && task.lane === lane);
}

export function openTasks(state: GameState): TaskCard[] {
  return state.tasks.filter((task) => task.lane === "open");
}

export function laneTasks(state: GameState, lane: TaskLane): TaskCard[] {
  return state.tasks.filter((task) => task.lane === lane);
}

export function playerWip(state: GameState, playerId: string): number {
  return activeTasks(state).filter((task) => task.ownerId === playerId).length;
}

export function completedTasks(state: GameState, playerId?: string): TaskCard[] {
  return state.tasks.filter(
    (task) => task.lane === "done" && (playerId === undefined || task.ownerId === playerId),
  );
}

export function taskContributions(state: GameState, task: TaskCard): Contribution[] {
  const byPlayer = new Map<string, Contribution>();
  task.attached.forEach((attached, index) => {
    const player = playerById(state, attached.ownerId);
    const entry = byPlayer.get(player.id) ?? {
      playerId: player.id,
      playerName: player.name,
      points: 0,
      cards: 0,
      lastOrder: -1,
    };
    entry.points += attached.playLevel;
    entry.cards += 1;
    entry.lastOrder = index;
    byPlayer.set(player.id, entry);
  });
  return [...byPlayer.values()].toSorted(
    (a, b) =>
      b.points - a.points ||
      b.cards - a.cards ||
      b.lastOrder - a.lastOrder ||
      a.playerId.localeCompare(b.playerId),
  );
}

export function deckCards(player: PlayerState): CardInstance[] {
  return [...player.deck, ...player.hand, ...player.discard];
}

export function attachedCardsOf(state: GameState, playerId: string): CardInstance[] {
  return state.tasks
    .filter((task) => task.ownerId === playerId)
    .flatMap((task) => task.attached)
    .filter((attached) => attached.ownerId === playerId)
    .map((attached) => attached.card);
}

export function scoreFromCards(state: GameState): number {
  let score = 0;
  for (const player of state.players) {
    for (const card of deckCards(player)) score += card.score ?? 0;
    for (const card of attachedCardsOf(state, player.id)) score += card.score ?? 0;
  }
  return score;
}

export function debtFromCards(state: GameState): number {
  let debt = 0;
  for (const player of state.players) {
    for (const card of deckCards(player)) {
      if (card.type === "debt") debt += 1;
    }
  }
  return debt;
}

/** デッキに残っているカードからチーム/個人スコアと負債を再計算する */
export function recomputeTeamStats(state: GameState): void {
  state.teamScore = scoreFromCards(state);
  state.teamDebt = debtFromCards(state);
  for (const player of state.players) {
    const owned = [...deckCards(player), ...attachedCardsOf(state, player.id)];
    player.score = owned.reduce((sum, card) => sum + (card.score ?? 0), 0);
  }
}

export function taskSum(task: TaskCard, type: "design" | "dev" | "test"): number {
  let total = task.tokenWork[type];
  for (const attached of task.attached) {
    if (attached.playType === type) total += attached.playLevel;
  }
  return total;
}

export function playerById(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`unknown player: ${playerId}`);
  return player;
}

export function makeSnapshot(state: GameState): DaySnapshot {
  const lanes = {
    open: 0,
    inbox: 0,
    wip: 0,
    test: 0,
    done: 0,
  };
  for (const task of state.tasks) {
    if (task.lane === "trash") continue;
    lanes[task.lane] += 1;
  }
  return {
    day: state.day,
    teamScore: state.teamScore,
    teamDebt: state.teamDebt,
    open: openTasks(state).length,
    wip: activeTasks(state).length,
    completed: completedTasks(state).length,
    lanes,
    perPlayer: state.players.map((player) => ({
      id: player.id,
      wip: playerWip(state, player.id),
      completed: player.completed,
      hand: player.hand.length,
      deck: player.deck.length,
      discard: player.discard.length,
    })),
  };
}
