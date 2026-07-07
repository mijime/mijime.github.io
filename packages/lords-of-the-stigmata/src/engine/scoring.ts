import type { BoardCountry, CountryKey, Tracks, OwnedDoctrine, RelicKey } from "../types.ts";
import { largestNetwork } from "./map.ts";
import { TRACK_KEYS, trackRankVP } from "./tracks.ts";
import { DOCTRINES } from "../data/doctrines.ts";
import { RELICS } from "../data/relics.ts";

const MAJ_VP = [4, 2];
const NETWORK_VP_PER = 2;

export function influence(bc: BoardCountry, pi: number): number {
  return bc.pawns.reduce((s, p) => (p.owner === pi ? s + (p.type === "ap" ? 3 : 1) : s), 0);
}

export function controllers(bc: BoardCountry): { first: number[]; second: number[] } {
  const owners = [...new Set(bc.pawns.map((p) => p.owner))];
  const infl = owners.map((o) => ({ o, v: influence(bc, o) })).filter((x) => x.v > 0);
  const values = [...new Set(infl.map((x) => x.v))].toSorted((a, b) => b - a);
  const first = infl.filter((x) => x.v === values[0]).map((x) => x.o);
  const second = values.length > 1 ? infl.filter((x) => x.v === values[1]).map((x) => x.o) : [];
  return { first, second };
}

export function majorityVP(board: BoardCountry[], n: number): number[] {
  const vp = Array<number>(n).fill(0);
  for (const bc of board) {
    const { first, second } = controllers(bc);
    if (first.length === 0) continue;
    if (first.length > 1) {
      const pool = MAJ_VP[0] + MAJ_VP[1];
      for (const o of first) vp[o] += Math.floor(pool / first.length);
    } else {
      vp[first[0]] += MAJ_VP[0];
      for (const o of second) vp[o] += Math.floor(MAJ_VP[1] / second.length);
    }
  }
  return vp;
}

export function networkVP(
  board: BoardCountry[],
  adj: Record<CountryKey, CountryKey[]>,
  n: number,
): number[] {
  // 盤面順で単独1位の支配者を並べる(largestNetworkのcontrol配列と対応)
  const control = Object.keys(adj).map((key) => {
    const bc = board.find((b) => b.key === key);
    if (!bc) return null;
    const { first } = controllers(bc);
    return first.length === 1 ? first[0] : null;
  });
  return Array.from({ length: n }, (_, pi) => {
    const size = largestNetwork(board, adj, control, pi);
    return size >= 2 ? size * NETWORK_VP_PER : 0;
  });
}

export function finalBreakdown(args: {
  players: { vp: number; tracks: Tracks; doctrines: OwnedDoctrine[]; relics: RelicKey[] }[];
  board: BoardCountry[];
  adj: Record<CountryKey, CountryKey[]>;
}): {
  total: number;
  lines: { key: string; n: number; params?: Record<string, string | number> }[];
}[] {
  const n = args.players.length;
  const maj = majorityVP(args.board, n);
  const net = networkVP(args.board, args.adj, n);
  const trackVp = TRACK_KEYS.map((k) =>
    trackRankVP(
      args.players.map((p) => p.tracks),
      k,
    ),
  );
  return args.players.map((p, i) => {
    const docVp = p.doctrines.reduce((s, d) => s + (d.lv === 2 ? DOCTRINES[d.key].endVp : 0), 0);
    const relicVp = p.relics.reduce((s, r) => s + (RELICS[r]?.vp ?? 0), 0);
    const lines: { key: string; n: number; params?: Record<string, string | number> }[] = [];
    if (p.vp > 0) lines.push({ key: "final.base", n: p.vp });
    TRACK_KEYS.forEach((k, ti) => {
      if (trackVp[ti][i] > 0)
        lines.push({ key: "final.track", n: trackVp[ti][i], params: { track: k } });
    });
    if (maj[i] > 0) lines.push({ key: "final.majority", n: maj[i] });
    if (net[i] > 0) lines.push({ key: "final.network", n: net[i] });
    if (docVp > 0) lines.push({ key: "final.doctrine", n: docVp });
    if (relicVp > 0) lines.push({ key: "final.relic", n: relicVp });
    return { total: lines.reduce((s, l) => s + l.n, 0), lines };
  });
}

export function finalScore(args: Parameters<typeof finalBreakdown>[0]): number[] {
  return finalBreakdown(args).map((r) => r.total);
}
