import { describe, expect, it } from "vitest";
import {
  controllers,
  finalBreakdown,
  finalScore,
  influence,
  majorityVP,
  networkVP,
} from "../src/engine/scoring.ts";
import { buildAdjacency } from "../src/engine/map.ts";
import { emptyTracks } from "../src/engine/tracks.ts";
import type { BoardCountry } from "../src/types.ts";

const pawn = (owner: number, type: "ac" | "ap" = "ac") => ({ owner, type, seq: 1, uid: 1 });
const bc = (key: string, pawns: ReturnType<typeof pawn>[]): BoardCountry => ({ key, pawns });

describe("influence & controllers", () => {
  it("apostle counts 3", () => {
    const c = bc("A", [pawn(0, "ap"), pawn(1), pawn(1)]);
    expect(influence(c, 0)).toBe(3);
    expect(influence(c, 1)).toBe(2);
    expect(controllers(c)).toEqual({ first: [0], second: [1] });
  });
  it("ties group players", () => {
    expect(controllers(bc("A", [pawn(0), pawn(1)]))).toEqual({ first: [0, 1], second: [] });
  });
});

describe("majorityVP", () => {
  it("4/2 per country, tie splits 1st+2nd pool", () => {
    const board = [bc("A", [pawn(0, "ap"), pawn(1)]), bc("B", [pawn(0), pawn(1)])];
    // A: 0が1位(4), 1が2位(2)。B: タイ→(4+2)/2=3ずつ
    expect(majorityVP(board, 2)).toEqual([7, 5]);
  });
});

describe("networkVP", () => {
  it("2VP per country in largest sole-controlled network of size>=2", () => {
    const sel = ["A", "B", "C", "D", "E", "F", "G"];
    const adj = buildAdjacency(sel);
    const n1 = adj["A"][0];
    const board = sel.map((k) => bc(k, k === "A" || k === n1 ? [pawn(0)] : []));
    expect(networkVP(board, adj, 2)[0]).toBe(4);
  });
});

it("finalScore sums vp + track VP + majority + network", () => {
  const t0 = emptyTracks();
  t0.mission = 3;
  const board = [bc("A", [pawn(0)])];
  const adj = { A: [] } as Record<string, string[]>;
  const res = finalScore({
    players: [
      { vp: 10, tracks: t0, doctrines: [], relics: [] },
      { vp: 5, tracks: emptyTracks(), doctrines: [], relics: [] },
    ],
    board,
    adj,
  });
  // p0: 10 + missionトラック1位8 + A国1位4 + network(サイズ1)0 = 22
  expect(res).toEqual([22, 5]);
});

it("lv2 doctrine adds endVp to final score", () => {
  const players = [
    {
      vp: 0,
      tracks: { mission: 0, sacrament: 0, sacrifice: 0, wisdom: 0 },
      doctrines: [{ key: "kyoka", lv: 2 as const }],
      relics: [],
    },
    {
      vp: 0,
      tracks: { mission: 0, sacrament: 0, sacrifice: 0, wisdom: 0 },
      doctrines: [{ key: "kyoka", lv: 1 as const }],
      relics: [],
    },
  ];
  const scores = finalScore({ players, board: [], adj: {} });
  expect(scores[0] - scores[1]).toBe(3); // kyoka endVp=3
});

it("finalBreakdown lines sum to finalScore totals", () => {
  const t0 = emptyTracks();
  t0.mission = 3;
  const board = [bc("A", [pawn(0)])];
  const adj = { A: [] } as Record<string, string[]>;
  const args = {
    players: [
      { vp: 10, tracks: t0, doctrines: [], relics: [] },
      { vp: 5, tracks: emptyTracks(), doctrines: [], relics: [] },
    ],
    board,
    adj,
  };
  const totals = finalScore(args);
  const bd = finalBreakdown(args);
  bd.forEach((r, i) => {
    expect(r.total).toBe(totals[i]);
    expect(r.lines.reduce((s, l) => s + l.n, 0)).toBe(totals[i]);
    for (const l of r.lines) expect(l.n).toBeGreaterThan(0);
  });
});
