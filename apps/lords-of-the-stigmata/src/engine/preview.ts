import type { CountryKey, GameState, PawnType } from "../types.ts";
import { cap, country, inflIn, inflOf } from "./helpers.ts";
import { hasSeat, isAdjacentToOwn } from "./map.ts";

export interface DispatchPreview {
  ok: boolean;
  costAc: number;
  costAp: number;
  rankBefore: number;
  rankAfter: number;
  tieAfter: boolean;
}

function rankOf(infls: number[], pi: number): { rank: number; tie: boolean } {
  const mine = infls[pi];
  if (mine <= 0) return { rank: 0, tie: false };
  const higher = infls.filter((v) => v > mine).length;
  const tie = infls.filter((v, i) => v === mine && i !== pi).length > 0;
  return { rank: higher + 1, tie };
}

/** stepExecActionのdispatch判定と同じ条件で、状態を変えずに結果を予測する */
export function previewDispatch(
  S: GameState,
  pi: number,
  pawn: PawnType,
  key: CountryKey,
): DispatchPreview {
  const c = country(S, key);
  const p = S.players[pi];
  const adjacent = isAdjacentToOwn(S.board, S.adj, pi, key);
  const feeWaived = adjacent || p.faction === "senkyoshi";
  const costAc = (pawn === "ac" ? 1 : 0) + (feeWaived ? 0 : 1);
  const costAp = pawn === "ap" ? 1 : 0;
  const ok = hasSeat(c, cap(S, key)) && p.act.ac >= costAc && p.act.ap >= costAp;

  const infls = S.players.map((_x, i) => inflIn(c, i));
  const before = rankOf(infls, pi);
  const after = [...infls];
  after[pi] += inflOf({ owner: pi, type: pawn, seq: 0, uid: 0 });
  const a = rankOf(after, pi);

  return {
    ok,
    costAc,
    costAp,
    rankBefore: before.rank,
    rankAfter: a.rank,
    tieAfter: a.tie,
  };
}
