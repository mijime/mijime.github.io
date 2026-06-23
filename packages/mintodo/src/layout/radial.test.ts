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
    status: "inbox",
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
    const angleB = UP + TAU / 3;
    expect(pos.b.x).toBeCloseTo(Math.cos(angleB) * RING, 5);
    expect(pos.b.y).toBeCloseTo(Math.sin(angleB) * RING, 5);
    const angleC = UP + (2 * TAU) / 3;
    expect(pos.c.x).toBeCloseTo(Math.cos(angleC) * RING, 5);
    expect(pos.c.y).toBeCloseTo(Math.sin(angleC) * RING, 5);
  });

  it("scales radius with depth", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["b"] });
    const b = node("b", { parentId: "a" });
    const pos = computeRadialPositions({ rootId: "root", nodes: nodes(root, a, b) });
    const dist = Math.hypot(pos.b.x - pos.a.x, pos.b.y - pos.a.y);
    expect(dist).toBeCloseTo(RING, 5);
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

  it("places a 3-level single-child chain on a straight vertical line", () => {
    const task1 = node("task1", { isRoot: true, children: ["tasks1-1"] });
    const tasks1_1 = node("tasks1-1", { parentId: "task1", children: ["tasks1-1-1"] });
    const tasks1_1_1 = node("tasks1-1-1", { parentId: "tasks1-1" });
    const pos = computeRadialPositions({
      rootId: "task1",
      nodes: nodes(task1, tasks1_1, tasks1_1_1),
    });
    expect(pos.task1).toEqual({ x: 0, y: 0 });
    expect(pos["tasks1-1"].x).toBeCloseTo(0, 10);
    expect(pos["tasks1-1"].y).toBeCloseTo(-RING, 10);
    expect(pos["tasks1-1-1"].x).toBeCloseTo(0, 10);
    expect(pos["tasks1-1-1"].y).toBeCloseTo(-2 * RING, 10);
  });

  it("places a 4-level single-child chain on a straight vertical line", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["b"] });
    const b = node("b", { parentId: "a", children: ["c"] });
    const c = node("c", { parentId: "b" });
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, a, b, c),
    });
    expect(pos.c.x).toBeCloseTo(0, 10);
    expect(pos.c.y).toBeCloseTo(-3 * RING, 10);
  });

  it("places a 5-level single-child chain on a straight vertical line", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["b"] });
    const b = node("b", { parentId: "a", children: ["c"] });
    const c = node("c", { parentId: "b", children: ["d"] });
    const d = node("d", { parentId: "c" });
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, a, b, c, d),
    });
    expect(pos.d.x).toBeCloseTo(0, 10);
    expect(pos.d.y).toBeCloseTo(-4 * RING, 10);
  });

  it("Buchheim contour: sibling subtrees of different parents do not overlap", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", {
      parentId: "root",
      children: ["a1", "a2", "a3", "a4", "a5"],
    });
    const aKids = ["a1", "a2", "a3", "a4", "a5"].map((id) => node(id, { parentId: "a" }));
    const b = node("b", { parentId: "root" });
    const all = [root, a, ...aKids, b];
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(...all),
    });
    const aKidsAngles = aKids.map((kid) => Math.atan2(pos[kid.id].y, pos[kid.id].x));
    const aMinA = Math.min(...aKidsAngles);
    const aMaxA = Math.max(...aKidsAngles);
    const bAngle = Math.atan2(pos.b.y, pos.b.x);
    expect(Math.abs(bAngle - aMinA)).toBeGreaterThan(Math.PI / 4);
    expect(Math.abs(bAngle - aMaxA)).toBeGreaterThan(Math.PI / 4);
  });

  it("non-root siblings are placed at distinct angles", () => {
    const root = node("root", { isRoot: true, children: ["a"] });
    const a = node("a", { parentId: "root", children: ["a1", "a2", "a3"] });
    const a1 = node("a1", { parentId: "a" });
    const a2 = node("a2", { parentId: "a" });
    const a3 = node("a3", { parentId: "a" });
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, a, a1, a2, a3),
    });
    const angleA1 = Math.atan2(pos.a1.y, pos.a1.x);
    const angleA2 = Math.atan2(pos.a2.y, pos.a2.x);
    const angleA3 = Math.atan2(pos.a3.y, pos.a3.x);
    expect(angleA1).not.toBeCloseTo(angleA2, 5);
    expect(angleA2).not.toBeCloseTo(angleA3, 5);
    expect(angleA1).not.toBeCloseTo(angleA3, 5);
  });

  it("2 root children with deep grandchildren never overlap", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", { parentId: "root", children: ["a1"] });
    const a1 = node("a1", { parentId: "a", children: ["a1a"] });
    const a1a = node("a1a", { parentId: "a1" });
    const b = node("b", { parentId: "root", children: ["b1"] });
    const b1 = node("b1", { parentId: "b", children: ["b1a"] });
    const b1a = node("b1a", { parentId: "b1" });
    const all = [root, a, a1, a1a, b, b1, b1a];
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(...all),
    });
    const seen = new Set<string>();
    for (const n of all) {
      const key = `${pos[n.id].x.toFixed(2)},${pos[n.id].y.toFixed(2)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("asymmetric tree: 5-child subtree does not overlap 1-child subtree", () => {
    const root = node("root", { isRoot: true, children: ["a", "b"] });
    const a = node("a", {
      parentId: "root",
      children: ["a1", "a2", "a3", "a4", "a5"],
    });
    const aKids = ["a1", "a2", "a3", "a4", "a5"].map((id) => node(id, { parentId: "a" }));
    const b = node("b", { parentId: "root", children: ["b1"] });
    const b1 = node("b1", { parentId: "b" });
    const all = [root, a, ...aKids, b, b1];
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(...all),
    });
    const seen = new Set<string>();
    for (const n of all) {
      const key = `${pos[n.id].x.toFixed(2)},${pos[n.id].y.toFixed(2)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("5 root children all get distinct angles", () => {
    const root = node("root", {
      isRoot: true,
      children: ["a", "b", "c", "d", "e"],
    });
    const kids = ["a", "b", "c", "d", "e"].map((id) => node(id, { parentId: "root" }));
    const pos = computeRadialPositions({
      rootId: "root",
      nodes: nodes(root, ...kids),
    });
    const angles = kids.map((k) => Math.atan2(pos[k.id].y, pos[k.id].x));
    for (let i = 0; i < angles.length; i++) {
      for (let j = i + 1; j < angles.length; j++) {
        expect(angles[i]).not.toBeCloseTo(angles[j], 5);
      }
    }
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
