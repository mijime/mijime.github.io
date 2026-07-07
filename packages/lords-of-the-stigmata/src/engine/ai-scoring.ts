import type { Action, Engine, TrackKey, BoardCountry } from "../types.ts";
import { cdef, cap as capHelper, country } from "./helpers.ts";
import { controllers, influence } from "./scoring.ts";
import { isAdjacentToOwn, cohabitants } from "./map.ts";
import { scoreEvent } from "./round-tiles.ts";
import { DOCTRINES } from "../data/doctrines.ts";

/** トラック1歩の価値: 現在順位が上がりうるほど高い(相対評価のレース感) */
function trackStepValue(e: Engine, pi: number, k: TrackKey): number {
  const my = e.S.players[pi].tracks[k];
  const above = e.S.players.filter((p, i) => i !== pi && p.tracks[k] >= my + 1).length;
  // 追い抜き/追いつきが起きる一歩は2点、単独先頭を伸ばす一歩は1点
  return above > 0 ? 2 : 1;
}

/** 単独1位を新規取得時は+4、さもなくば0 */
function soleFirstGain(bc: BoardCountry, pi: number, delta: number): number {
  const { first } = controllers(bc);
  const myInfl = influence(bc, pi) + delta;
  const topInfl = first.length > 0 ? influence(bc, first[0]) : 0;
  if (!(first.length === 1 && first[0] === pi) && myInfl > topInfl) return 4;
  return 0;
}

function gainValue(
  e: Engine,
  pi: number,
  g: { ac?: number; ap?: number; vp?: number; track?: TrackKey },
): number {
  let v = 0;
  if (g.ac) v += g.ac;
  if (g.ap) v += g.ap * 2;
  if (g.vp) v += g.vp * 2;
  if (g.track) v += trackStepValue(e, pi, g.track);
  return v;
}

/** Heuristic bonuses to amplify scoring in specific tactical situations */
export function improvedBonus(e: Engine, pi: number, a: Action): number {
  let bonus = 0;
  const p = e.S.players[pi];
  const faction = p.faction;

  // Shisai early dispatch bonus
  if (faction === "shisai" && a.type === "dispatch" && e.S.round <= 2) {
    bonus += 2;
  }

  // Kenja surplus action cards bonus
  if (faction === "kenja" && a.type === "dispatch" && p.act.ac >= 3) {
    bonus += 4;
  }

  // Endgame bonuses (round 5+)
  if (e.S.round >= 5) {
    if (a.type === "dispatch" || a.type === "promote") {
      bonus += 2;
    }
    if (
      (a.type === "dispatch" && cdef(a.country).effect?.track) ||
      (a.type === "acquire" && DOCTRINES[a.doc].lv1.track) ||
      a.type === "promote"
    ) {
      bonus += 1.5;
    }
  }

  return bonus;
}

/** アクションの決定論スコア。大きいほど良い。pass は 0。 */
export function scoreAction(e: Engine, pi: number, a: Action): number {
  const S = e.S;
  const p = S.players[pi];
  const tile = S.roundTiles[S.round - 1];
  switch (a.type) {
    case "pass":
      return 0;
    case "dispatch": {
      const bc = S.board.find((b) => b.key === a.country)!;
      const eff = cdef(a.country).effect;
      let v = scoreEvent(tile, a.pawn === "ap" ? "dispatchAp" : "dispatchAc") * 2;
      if (cohabitants(bc, pi).length > 0) v += scoreEvent(tile, "cohabit") * 2;
      v += gainValue(e, pi, eff);
      if (eff.apExtra && a.pawn === "ap") v += gainValue(e, pi, eff);
      // マジョリティ: 単独1位を新規に取れる派遣は+4
      const { first } = controllers(bc);
      const myInfl = influence(bc, pi) + (a.pawn === "ap" ? 3 : 1);
      const topInfl = first.length > 0 ? influence(bc, first[0]) : 0;
      if (!(first.length === 1 && first[0] === pi) && myInfl > topInfl) v += 4;
      // 収入エンジン: 序盤ほど盤上ポーンの価値が高い
      v += Math.max(0, 4 - S.round) * 0.5;
      // 手数料コストは減点
      const isSenkyoshi =
        p.faction === "senkyoshi" && !isAdjacentToOwn(S.board, S.adj, pi, a.country);
      const limit = S.players.length === 3 ? 1 : 2;
      const feeWaived =
        isAdjacentToOwn(S.board, S.adj, pi, a.country) || (isSenkyoshi && p.feeWaiverCount < limit);
      if (!feeWaived) v -= 1;
      // 残席1の国は競りの締めとして僅かに加点
      if (bc.pawns.length === capHelper(S, a.country) - 1) v += 0.5;
      return v + improvedBonus(e, pi, a);
    }
    case "promote": {
      let v = scoreEvent(tile, "promote") * 2 + trackStepValue(e, pi, "sacrifice") + 1;
      if (p.faction === "junkyosha") v += 2;
      return v + improvedBonus(e, pi, a);
    }
    case "acquire": {
      const def = DOCTRINES[a.doc];
      let v =
        scoreEvent(tile, "acquire") * 2 +
        trackStepValue(e, pi, def.track) +
        gainValue(e, pi, def.lv1);
      if (p.faction !== "shisai") v -= 1; // トラック後退コスト
      return v + improvedBonus(e, pi, a);
    }
    case "deepen": {
      const def = DOCTRINES[a.doc];
      return scoreEvent(tile, "deepen") * 2 + gainValue(e, pi, def.lv2) + def.endVp;
    }
    case "upgrade": {
      const bc = country(S, a.country);
      return soleFirstGain(bc, pi, 2) - 0.5;
    }
  }
}
