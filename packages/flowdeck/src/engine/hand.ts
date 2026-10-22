import type { GameState, PlayerState } from "./types";
import { HAND_SIZE } from "./types";
import { randInt, shuffle } from "./rng";

export function drawCards(state: GameState, player: PlayerState, count: number): number {
  let drawn = 0;
  for (let i = 0; i < count; i += 1) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) break;
      player.deck = shuffle(state, player.discard);
      player.discard = [];
    }
    const card = player.deck.shift();
    if (!card) break;
    player.hand.push(card);
    drawn += 1;
  }
  return drawn;
}

/** 手札が尽きたら5枚補充する */
export function drawIfEmpty(state: GameState, player: PlayerState): number {
  if (player.hand.length > 0) return 0;
  return drawCards(state, player, HAND_SIZE);
}

export function discardHand(player: PlayerState): number {
  const count = player.hand.length;
  player.discard.push(...player.hand);
  player.hand = [];
  return count;
}

export function addCardToDiscard(
  state: GameState,
  player: PlayerState,
  type: "design" | "dev" | "test" | "debt",
  level: number,
  count: number,
): void {
  for (let i = 0; i < count; i += 1) {
    player.discard.push({ id: state.nextCardId++, type, level });
  }
}

export function randomCardIndex(state: GameState, length: number): number {
  return randInt(state, length);
}
