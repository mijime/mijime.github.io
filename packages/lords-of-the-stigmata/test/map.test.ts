import { describe, expect, it } from "vitest";
import {
  buildAdjacency,
  cohabitants,
  hasSeat,
  isAdjacentToOwn,
  largestNetwork,
  LAYOUT_EDGES,
} from "../src/engine/map.ts";
import type { BoardCountry } from "../src/types.ts";

const SEL = ["A", "B", "C", "D", "E", "F", "G"];
const pawn = (owner: number) => ({ owner, type: "ac" as const, seq: 1, uid: 1 });
const bc = (key: string, owners: number[]): BoardCountry => ({ key, pawns: owners.map(pawn) });

describe("layout", () => {
  it("has 7 slots, every slot has 2-4 neighbors, symmetric", () => {
    const adj = buildAdjacency(SEL);
    expect(Object.keys(adj)).toHaveLength(7);
    for (const [k, ns] of Object.entries(adj)) {
      expect(ns.length).toBeGreaterThanOrEqual(2);
      expect(ns.length).toBeLessThanOrEqual(4);
      for (const n of ns) expect(adj[n]).toContain(k);
    }
    expect(LAYOUT_EDGES.length).toBeGreaterThan(0);
  });
});

describe("seats & adjacency", () => {
  it("hasSeat respects capacity", () => {
    expect(hasSeat(bc("A", [0, 1]), 2)).toBe(false);
    expect(hasSeat(bc("A", [0]), 2)).toBe(true);
  });
  it("isAdjacentToOwn is true only when own pawn sits next door", () => {
    const adj = buildAdjacency(SEL);
    const neighbor = adj["A"][0];
    const board = SEL.map((k) => bc(k, k === neighbor ? [0] : []));
    expect(isAdjacentToOwn(board, adj, 0, "A")).toBe(true);
    expect(isAdjacentToOwn(board, adj, 1, "A")).toBe(false);
  });
  it("cohabitants lists distinct other owners", () => {
    expect(cohabitants(bc("A", [1, 1, 2, 0]), 0)).toEqual([1, 2]);
  });
});

describe("largestNetwork", () => {
  it("returns size of biggest connected controlled component", () => {
    const adj = buildAdjacency(SEL);
    // Aとその隣を支配 → 2連結。さらに孤立1国 → 最大は2
    const n1 = adj["A"][0];
    const isolated = SEL.find(
      (k) => k !== "A" && k !== n1 && !adj["A"].includes(k) && !adj[n1].includes(k),
    )!;
    const control = SEL.map((k) => (k === "A" || k === n1 || k === isolated ? 0 : null));
    expect(largestNetwork([], adj, control, 0)).toBe(2);
  });
});
