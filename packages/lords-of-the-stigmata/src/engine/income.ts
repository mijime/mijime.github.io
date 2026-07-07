import type { BoardCountry, FactionKey, Player, Tracks } from "../types.ts";

export interface Income {
  ac: number;
  ap: number;
}

export function calcIncome(
  board: BoardCountry[],
  pi: number,
  p?: { faction: FactionKey | null; tracks: Tracks },
): Income {
  const mine = board.flatMap((bc) => bc.pawns.filter((pw) => pw.owner === pi));
  const apCnt = mine.filter((pw) => pw.type === "ap").length;
  const base = p?.faction === "kaitakusha" ? 3 : 2;
  let ac = base + Math.floor(mine.length / 2);
  if (p?.faction === "kenja" && p.tracks.wisdom >= 4) ac += 1;
  return { ac, ap: Math.floor(apCnt / 2) };
}

export function applyIncome(p: Player, inc: Income): void {
  p.act.ac += inc.ac;
  p.act.ap += inc.ap;
}
