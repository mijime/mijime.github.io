import { RELIC_CAP, RELIC_CHOICES, RELICS, relicName } from "../data/relics";
import { pushLog } from "./log";
import { shuffle } from "./rng";
import type { GameState, PlayerState } from "./types";

export function hasRelic(state: GameState, id: string): boolean {
  return (state.teamRelics ?? []).includes(id);
}

export function teamRelics(state: GameState): string[] {
  return state.teamRelics ?? [];
}

/** 未取得のレリックから候補を引く。 */
export function relicChoicesFor(state: GameState, count = RELIC_CHOICES): string[] {
  const owned = new Set(teamRelics(state));
  const pool = RELICS.filter((relic) => !owned.has(relic.id)).map((relic) => relic.id);
  return shuffle(state, pool).slice(0, count);
}

/** AI はアクション/ドロー/トークン系を優先する。 */
const AI_PRIORITY = [
  "flow",
  "insight",
  "catalyst",
  "tempo",
  "reserve",
  "safety",
  "salvage",
  "lean",
];

export function chooseAiRelic(options: string[]): string | null {
  for (const id of AI_PRIORITY) {
    if (options.includes(id)) return id;
  }
  return options[0] ?? null;
}

export function chooseAiRelicDiscard(current: string[]): string | undefined {
  return current.toSorted((a, b) => AI_PRIORITY.indexOf(b) - AI_PRIORITY.indexOf(a))[0];
}

/** レリックをチームに追加する。上限時は discardId を外す。 */
export function grantRelic(state: GameState, relicId: string, discardId?: string): boolean {
  const owned = (state.teamRelics ??= []);
  if (owned.includes(relicId)) return false;
  if (owned.length >= RELIC_CAP) {
    if (!discardId || !owned.includes(discardId)) return false;
    state.teamRelics = owned.filter((id) => id !== discardId);
  }
  state.teamRelics.push(relicId);
  pushLog(state, `チームレリック: ${relicName(relicId)}`, "good");

  if (relicId === "reserve") {
    for (const player of state.players) {
      player.tokens.mi = (player.tokens.mi ?? 0) + 1;
    }
    pushLog(state, "予備電源: 全員のLLMトークン +1", "good");
  }
  return true;
}

/** 日開始時のレリック効果。 */
export function applyRelicDayStart(state: GameState, player: PlayerState): void {
  if (hasRelic(state, "safety")) {
    player.shields = (player.shields ?? 0) + 1;
  }
  if (hasRelic(state, "tempo")) {
    player.tokens.mi = (player.tokens.mi ?? 0) + 1;
  }
  if (hasRelic(state, "salvage")) {
    const card = player.discard
      .filter((candidate) => candidate.type !== "debt")
      .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.level - a.level)[0];
    if (card) {
      player.discard = player.discard.filter((candidate) => candidate.id !== card.id);
      player.hand.push(card);
      pushLog(state, `${player.name}: 回収で1枚を手札へ`, "good");
    }
  }
}
