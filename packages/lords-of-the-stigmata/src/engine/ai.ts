import type { Action, CountryKey, Engine } from "../types.ts";
import { hasSeat, isAdjacentToOwn } from "./map.ts";
import { cap as capHelper, country } from "./helpers.ts";
import { DKEYS } from "../data/doctrines.ts";
import { scoreAction } from "./ai-scoring.ts";
import { controllers } from "./scoring.ts";

/** エンジンの検証と同一条件で合法手を列挙(順序は決定論: 型→S.sel/DKEYS順) */
export function legalActions(e: Engine, pi: number): Action[] {
  const S = e.S;
  const p = S.players[pi];
  const acts: Action[] = [];
  const limit = S.players.length === 3 ? 1 : 2;
  for (const key of S.sel) {
    const bc = country(S, key);
    if (!hasSeat(bc, capHelper(S, key))) continue;
    const adjacent = isAdjacentToOwn(S.board, S.adj, pi, key);
    const isSenkyoshi = p.faction === "senkyoshi" && !adjacent;
    const feeWaived = adjacent || (isSenkyoshi && p.feeWaiverCount < limit);
    const fee = feeWaived ? 0 : 1;
    if (p.act.ac >= 1 + fee) acts.push({ type: "dispatch", pawn: "ac", country: key });
    if (p.act.ap >= 1 && p.act.ac >= fee) acts.push({ type: "dispatch", pawn: "ap", country: key });
  }
  if (p.act.ac >= 2) acts.push({ type: "promote" });
  if (p.act.ac >= 2 && p.doctrines.length < 3) {
    for (const doc of DKEYS) {
      if (!p.doctrines.some((d) => d.key === doc)) acts.push({ type: "acquire", doc });
    }
  }
  const canDeepen = p.faction === "shinpika" ? p.act.ac >= 2 : p.act.ac >= 1 && p.act.ap >= 1;
  if (canDeepen) {
    for (const d of p.doctrines) {
      if (d.lv === 1) acts.push({ type: "deepen", doc: d.key });
    }
  }
  if (p.act.ac >= 1) {
    for (const key of S.sel) {
      const bc = country(S, key);
      const acPawn = bc.pawns.find((pw) => pw.owner === pi && pw.type === "ac");
      if (acPawn) acts.push({ type: "upgrade", country: key });
    }
  }
  return acts;
}

/** 最良スコアの合法手を返す。全手スコア<=0 なら pass(同点は列挙順で先勝ち) */
export function decideAction(e: Engine, pi: number): Action {
  let best: Action = { type: "pass" };
  let bestScore = 0;
  for (const a of legalActions(e, pi)) {
    const s = scoreAction(e, pi, a);
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  return best;
}

export function aiFreeTarget(_e: Engine, _pi: number, valid: CountryKey[]): CountryKey {
  return valid[0];
}

/** 回収候補の国を返す。1位(同点含む)に絡まない信徒のみ、終盤(最終得点直前)は回収しない */
export function decideRecall(e: Engine, pi: number): CountryKey | null {
  const S = e.S;
  if (S.round > 4) return null;
  for (const key of S.sel) {
    const bc = country(S, key);
    if (!bc.pawns.some((pw) => pw.owner === pi && pw.type === "ac")) continue;
    if (!controllers(bc).first.includes(pi)) return key;
  }
  return null;
}
