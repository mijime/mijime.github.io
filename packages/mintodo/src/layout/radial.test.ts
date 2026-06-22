import { describe, expect, it } from "vitest";
import type { MindNode } from "../types";
import { applyRadialLayout, computeRadialPositions } from "./radial";

function node(id: string, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId: "b1",
    text: opts.text ?? id,
    parentId: opts.parentId ?? null,
    isRoot: opts.isRoot ?? false,
    completed: false,
    collapsed: opts.collapsed ?? false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: opts.children ?? [],
    x: 0,
    y: 0,
  };
}

function nodes(...ns: MindNode[]): Record<string, MindNode> {
  const rec: Record<string, MindNode> = {};
  for (const n of ns) rec[n.id] = n;
  return rec;
}

const RING = 240;
const TAU = Math.PI * 2;
const UP = -Math.PI / 2;

describe("computeRadialPositions", () => {
  it("uses 340 as the default ringDistance", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a) });
    expect(Math.hypot(pos.a.x, pos.a.y)).toBeCloseTo(RING, 5);
  });

  it("places root alone at the origin", () => {
    const root = node("root", { isRoot: true });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root) });
    expect(pos.root).toEqual({ x: 0, y: 0 });
  });

  it("places a single root child directly above the root (special case)", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a) });
    expect(pos.a.x).toBeCloseTo(0, 10);
    expect(pos.a.y).toBeCloseTo(-RING, 10);
  });

  it("distributes three root children evenly starting at 12 o'clock", () => {
    const root = node("root", { isRoot: true, children: ["a", "b", "c"] });
    const a = node("a", { parentId: "root" });
    const b = node("b", { parentId: "root" });
    const c = node("c", { parentId: "root" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a, b, c) });
    expect(pos.a.x).toBeCloseTo(0, 5);
    expect(pos.a.y).toBeCloseTo(-RING, 5);
    const slice = TAU / 3;
    const angleB = UP + slice;
    const ringB = RING * (1 + 1 * 0.12);
    expect(pos.b.x).toBeCloseTo(Math.cos(angleB) * ringB, 5);
    expect(pos.b.y).toBeCloseTo(Math.sin(angleB) * ringB, 5);
    const angleC = UP + 2 * slice;
    const ringC = RING * (1 + 2 * 0.12);
    expect(pos.c.x).toBeCloseTo(Math.cos(angleC) * ringC, 5);
    expect(pos.c.y).toBeCloseTo(Math.sin(angleC) * ringC, 5);
  });

  it("scales radius with depth", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["b"] });
    const b = node("b", { parentId: "a" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a, b) });
    const dist = Math.hypot(pos.b.x - pos.a.x, pos.b.y - pos.a.y);
    expect(dist).toBeCloseTo(RING, 5);
  });

  it("splits a non-root's arc proportional to leaf count", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["a1", "a2", "a3", "a4", "a5", "b1"] });
    const aChildren = ["a1", "a2", "a3", "a4", "a5"].map((id) =>
      node(id, { parentId: "a", children: ["leaf"] }),
    );
    const leaf1 = node("leaf", { parentId: "a1" });
    const leaf2 = node("leaf2", { parentId: "a2" });
    const leaf3 = node("leaf3", { parentId: "a3" });
    const leaf4 = node("leaf4", { parentId: "a4" });
    const leaf5 = node("leaf5", { parentId: "a5" });
    const b1 = node("b1", { parentId: "a" });
    const all = [root, a, ...aChildren, leaf1, leaf2, leaf3, leaf4, leaf5, b1];
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(...all) });
    const dist = (id: string) => Math.hypot(pos[id].x - pos.a.x, pos[id].y - pos.a.y);
    expect(dist("a1")).toBeCloseTo(RING, 5);
    expect(dist("b1")).toBeCloseTo(RING * (1 + 5 * 0.12), 5);
  });

  it("places children progressively further outward", () => {
    const root = node("root", { isRoot: true, children: ["a", "b", "c", "d"] });
    const a = node("a", { parentId: "root" });
    const b = node("b", { parentId: "root" });
    const c = node("c", { parentId: "root" });
    const d = node("d", { parentId: "root" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a, b, c, d) });
    const dA = Math.hypot(pos.a.x, pos.a.y);
    const dB = Math.hypot(pos.b.x, pos.b.y);
    const dC = Math.hypot(pos.c.x, pos.c.y);
    const dD = Math.hypot(pos.d.x, pos.d.y);
    expect(dB).toBeGreaterThan(dA);
    expect(dC).toBeGreaterThan(dB);
    expect(dD).toBeGreaterThan(dC);
    expect(dA).toBeCloseTo(RING, 5);
  });

  it("hides descendants of a collapsed node", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", collapsed: true, children: ["a1"] });
    const a1 = node("a1", { parentId: "a" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a, a1) });
    expect(pos.a).toBeDefined();
    expect(pos.a1).toBeUndefined();
  });

  it("treats a collapsed leaf as 1 leaf for sibling proportion", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", { parentId: "root", children: ["a1", "a2", "a3"] });
    const a1 = node("a1", { parentId: "a", collapsed: true, children: ["x"] });
    const a2 = node("a2", { parentId: "a" });
    const a3 = node("a3", { parentId: "a" });
    const x = node("x", { parentId: "a1" });
    const b = node("b", { parentId: "root" });
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, a, a1, a2, a3, x, b),
    });
    expect(pos.a).toBeDefined();
    expect(pos.b).toBeDefined();
    expect(pos.a1).toBeDefined();
    expect(pos.x).toBeUndefined();
  });

  it("is deterministic for the same input", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", { parentId: "root", children: ["a1"] });
    const a1 = node("a1", { parentId: "a" });
    const b = node("b", { parentId: "root" });
    const all = { rootId: "root", nodes: nodes(root, a, a1, b) };
    const p1 = computeRadialPositions(all);
    const p2 = computeRadialPositions(all);
    expect(p1).toEqual(p2);
  });

  it("omits unknown ids and nodes absent from the map", () => {
    const root = node("root", { isRoot: true, children: ["a", "missing"] });
    const a = node("a", { parentId: "root" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a) });
    expect(pos.root).toBeDefined();
    expect(pos.a).toBeDefined();
    expect(Object.keys(pos)).toEqual(["root", "a"]);
  });

  it("confines each root child's subtree to its allocated arc", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", { parentId: "root", children: ["a1"] });
    const a1 = node("a1", { parentId: "a" });
    const b = node("b", { parentId: "root", children: ["b1"] });
    const b1 = node("b1", { parentId: "b" });
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, a, a1, b, b1),
    });
    const angleA1 = Math.atan2(pos.a1.y - pos.a.y, pos.a1.x - pos.a.x);
    const angleB1 = Math.atan2(pos.b1.y - pos.b.y, pos.b1.x - pos.b.x);
    expect(Math.abs(angleA1 - UP)).toBeLessThan(Math.PI / 2 + 0.01);
    expect(Math.abs(angleB1 - (UP + Math.PI))).toBeLessThan(Math.PI / 2 + 0.01);
  });
});

describe("applyRadialLayout", () => {
  it("returns a new nodes record with x/y updated", () => {
    const root = node("root", { isRoot: true, children: ["a"], x: 999, y: 999 });
    const a = node("a", { parentId: "root", x: -100, y: 50 });
    const s = { nodes: nodes(root, a) };
    const out = applyRadialLayout(s);
    expect(out.root.x).toBe(0);
    expect(out.root.y).toBe(0);
    expect(out.a.x).toBeCloseTo(0, 10);
    expect(out.a.y).toBe(-RING);
    expect(out.root.text).toBe(root.text);
  });

  it("sets hidden nodes to (0, 0)", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", collapsed: true, children: ["a1"] });
    const a1 = node("a1", { parentId: "a", x: 50, y: 50 });
    const out = applyRadialLayout({ nodes: nodes(root, a, a1) });
    expect(out.a1.x).toBe(0);
    expect(out.a1.y).toBe(0);
  });
});
