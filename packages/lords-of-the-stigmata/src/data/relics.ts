import type { RelicDef, RelicKey } from "../types.ts";

export const RELICS: Record<RelicKey, RelicDef> = {
  rashinban: {
    vp: 3,
    cond: (S, pi) =>
      new Set(S.board.filter((b) => b.pawns.some((p) => p.owner === pi)).map((b) => b.key)).size >=
      3,
  },
  honoo: { vp: 3, cond: (S, pi) => S.players[pi].tracks.mission >= 4 },
  shokan: {
    vp: 4,
    cond: (S, pi) =>
      S.board.reduce((s, b) => s + b.pawns.filter((p) => p.owner === pi).length, 0) >= 4,
  },
  seiyaku: { vp: 5, cond: (S, pi) => S.players[pi].doctrines.length >= 2 },
  monsho: {
    vp: 6,
    cond: (S, pi) =>
      S.board.reduce(
        (s, b) => s + b.pawns.filter((p) => p.owner === pi && p.type === "ap").length,
        0,
      ) >= 2,
  },
  izumi: { vp: 7, cond: (S, pi) => S.players[pi].tracks.sacrament >= 6 },
  hihou: {
    vp: 8,
    cond: (S, pi) =>
      (["mission", "sacrament", "sacrifice", "wisdom"] as const).filter(
        (k) => S.players[pi].tracks[k] >= 4,
      ).length >= 3,
  },
  kanmuri: {
    vp: 9,
    cond: (S, pi) =>
      S.board.filter((b) => {
        const infl = new Map<number, number>();
        for (const p of b.pawns)
          infl.set(p.owner, (infl.get(p.owner) ?? 0) + (p.type === "ap" ? 3 : 1));
        const max = Math.max(0, ...infl.values());
        return (
          max > 0 &&
          infl.get(pi) === max &&
          [...infl.values()].filter((v) => v === max).length === 1
        );
      }).length >= 2,
  },
  kessho: {
    vp: 10,
    cond: (S, pi) =>
      (["mission", "sacrament", "sacrifice", "wisdom"] as const).some(
        (k) => S.players[pi].tracks[k] >= 10,
      ),
  },
  sekiban: {
    vp: 12,
    cond: (S, pi) => S.players[pi].doctrines.filter((d) => d.lv === 2).length >= 2,
  },
};

export const RKEYS = Object.keys(RELICS);
