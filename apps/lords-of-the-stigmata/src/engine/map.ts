import type { BoardCountry, CountryKey } from "../types.ts";

// 中央1+外周6のホイール型: 全頂点が次数2以上、中央は次数4未満に抑えるため外周の一部のみ接続
export const LAYOUT_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0], // 外周リング
  [6, 0],
  [6, 2],
  [6, 4], // 中央スロット6は1つおきに接続
];

export function buildAdjacency(sel: CountryKey[]): Record<CountryKey, CountryKey[]> {
  const adj: Record<CountryKey, CountryKey[]> = Object.fromEntries(sel.map((k) => [k, []]));
  for (const [a, b] of LAYOUT_EDGES) {
    adj[sel[a]].push(sel[b]);
    adj[sel[b]].push(sel[a]);
  }
  return adj;
}

export function hasSeat(bc: BoardCountry, cap: number): boolean {
  return bc.pawns.length < cap;
}

export function isAdjacentToOwn(
  board: BoardCountry[],
  adj: Record<CountryKey, CountryKey[]>,
  pi: number,
  target: CountryKey,
): boolean {
  return board.some((bc) => adj[target].includes(bc.key) && bc.pawns.some((p) => p.owner === pi));
}

export function cohabitants(bc: BoardCountry, pi: number): number[] {
  return [...new Set(bc.pawns.map((p) => p.owner).filter((o) => o !== pi))];
}

export function largestNetwork(
  _board: BoardCountry[],
  adj: Record<CountryKey, CountryKey[]>,
  control: (CountryKey | null | number)[],
  pi: number,
): number {
  const keys = Object.keys(adj);
  const mine = new Set(keys.filter((_, i) => control[i] === pi));
  let best = 0;
  const seen = new Set<string>();
  for (const start of mine) {
    if (seen.has(start)) continue;
    let size = 0;
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const k = stack.pop()!;
      size++;
      for (const n of adj[k])
        if (mine.has(n) && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
    }
    best = Math.max(best, size);
  }
  return best;
}
