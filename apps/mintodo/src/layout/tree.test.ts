import { describe, expect, it } from "vitest";
import { computeTreePositions, applyTreeLayout } from "./tree";
import type { MindNode } from "../types";

function makeNode(id: string, parentId: string | null, children: string[]): MindNode {
  return {
    id,
    boardId: "b1",
    text: id,
    parentId,
    isRoot: parentId === null,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    startDate: "",
    status: "inbox",
    children,
    estimate: null,
    workLogs: [],
    x: 0,
    y: 0,
  };
}

function makeTree(): Record<string, MindNode> {
  return {
    root: makeNode("root", null, ["a", "b"]),
    a: makeNode("a", "root", ["a1", "a2"]),
    a1: makeNode("a1", "a", []),
    a2: makeNode("a2", "a", []),
    b: makeNode("b", "root", []),
  };
}

describe("computeTreePositions", () => {
  it("places root at origin", () => {
    const pos = computeTreePositions("root", makeTree());
    expect(pos["root"]).toEqual({ x: 0, y: 0 });
  });

  it("places children one depth-step to the right", () => {
    const pos = computeTreePositions("root", makeTree(), { hSpacing: 360, vSpacing: 140 });
    expect(pos["a"].x).toBe(360);
    expect(pos["a1"].x).toBe(720);
  });

  it("gives every leaf a distinct vertical slot (no overlap)", () => {
    const pos = computeTreePositions("root", makeTree(), { vSpacing: 140 });
    const leafYs = [pos["a1"].y, pos["a2"].y, pos["b"].y];
    expect(new Set(leafYs).size).toBe(3);
    const sorted = [...leafYs].toSorted((p, q) => p - q);
    expect(sorted[1] - sorted[0]).toBeGreaterThanOrEqual(140);
    expect(sorted[2] - sorted[1]).toBeGreaterThanOrEqual(140);
  });

  it("centers a parent on the midpoint of its first and last child", () => {
    const pos = computeTreePositions("root", makeTree());
    expect(pos["a"].y).toBe((pos["a1"].y + pos["a2"].y) / 2);
  });

  it("excludes descendants of collapsed nodes", () => {
    const nodes = makeTree();
    nodes["a"] = { ...nodes["a"], collapsed: true };
    const pos = computeTreePositions("root", nodes);
    expect(pos["a1"]).toBeUndefined();
    expect(pos["a2"]).toBeUndefined();
    expect(pos["a"]).toBeDefined();
  });
});

describe("applyTreeLayout", () => {
  it("writes positions onto nodes and zeroes unreachable nodes", () => {
    const nodes = { ...makeTree(), orphan: makeNode("orphan", "missing", []) };
    nodes["orphan"] = { ...nodes["orphan"], isRoot: false };
    const out = applyTreeLayout({ nodes });
    expect(out["a"].x).toBeGreaterThan(0);
    expect(out["orphan"]).toMatchObject({ x: 0, y: 0 });
  });
});
