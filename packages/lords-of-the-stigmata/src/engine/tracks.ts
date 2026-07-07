import type { TrackKey, Tracks } from "../types.ts";

export const TRACK_KEYS: TrackKey[] = ["mission", "sacrament", "sacrifice", "wisdom"];
export const TRACK_MAX = 12;
const RANK_VP = [8, 4, 2];

export function emptyTracks(): Tracks {
  return { mission: 0, sacrament: 0, sacrifice: 0, wisdom: 0 };
}

export function advanceTrack(t: Tracks, k: TrackKey, n: number): number {
  const gain = Math.min(n, TRACK_MAX - t[k]);
  t[k] += gain;
  return gain;
}

export function retreatTrack(t: Tracks, k: TrackKey, n: number): number {
  const loss = Math.min(n, t[k]);
  t[k] -= loss;
  return loss;
}

export function trackRankVP(all: Tracks[], k: TrackKey): number[] {
  const vp = all.map(() => 0);
  const values = [...new Set(all.map((t) => t[k]).filter((v) => v > 0))].toSorted((a, b) => b - a);
  let rank = 0;
  for (const v of values) {
    if (rank >= RANK_VP.length) break;
    const idxs = all.flatMap((t, i) => (t[k] === v ? [i] : []));
    const pool = RANK_VP.slice(rank, rank + idxs.length).reduce((a, b) => a + b, 0);
    for (const i of idxs) vp[i] = Math.floor(pool / idxs.length);
    rank += idxs.length;
  }
  return vp;
}
