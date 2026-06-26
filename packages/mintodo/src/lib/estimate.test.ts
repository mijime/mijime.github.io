import { describe, expect, it } from "vitest";
import type { MindNode } from "../types";
import { computeEstimates, effectiveEstimate } from "./estimate";

function n(id: string, parentId: string | null, opts: Partial<MindNode> = {}): MindNode {
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
    status: "inbox",
    children: opts.children ?? [],
    x: 0,
    y: 0,
    estimate: opts.estimate ?? null,
    workLogs: [],
    ...opts,
    startDate: opts.startDate ?? "",
  };
}

describe("effectiveEstimate", () => {
  it("leaf with null → 4 (implicit 4h for leaf)", () =>
    expect(effectiveEstimate({ a: n("a", "root") }, "a")).toBe(4));
  it("leaf with 8 → 8", () =>
    expect(effectiveEstimate({ a: n("a", "root", { estimate: 8 }) }, "a")).toBe(8));
  it("parent null, two leaf children → 8 (both leaves get implicit 4h)", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a"] }),
      a: n("a", "root", { children: ["b", "c"] }),
      b: n("b", "a"),
      c: n("c", "a"),
    };
    expect(effectiveEstimate(nodes, "a")).toBe(8);
  });
  it("parent with 24h → 24", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a"] }),
      a: n("a", "root", { estimate: 24, children: ["b", "c"] }),
      b: n("b", "a"),
      c: n("c", "a"),
    };
    expect(effectiveEstimate(nodes, "a")).toBe(24);
  });
  it("missing id → 0", () => expect(effectiveEstimate({}, "missing")).toBe(0));
  it("completed leaf with estimate → 0", () => {
    expect(effectiveEstimate({ a: n("a", "root", { estimate: 8, completed: true }) }, "a")).toBe(0);
  });
  it("completed leaf without estimate → 0", () => {
    expect(effectiveEstimate({ a: n("a", "root", { completed: true }) }, "a")).toBe(0);
  });
  it("zero estimate → treated as null (leaf returns 4)", () => {
    expect(effectiveEstimate({ a: n("a", "root", { estimate: 0 }) }, "a")).toBe(4);
  });
  it("deep nest 8 levels, all implicit → 4 (deepest leaf 4h)", () => {
    const nodes: Record<string, MindNode> = {};
    let prev = "root";
    nodes[prev] = n("root", null, { isRoot: true, children: [] });
    for (let i = 1; i <= 8; i++) {
      const id = `n${i}`;
      nodes[prev].children.push(id);
      nodes[id] = n(id, prev, { children: [] });
      prev = id;
    }
    expect(effectiveEstimate(nodes, "root")).toBe(4);
  });
  it("parent + leaf child with estimate 5 → 5", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a"] }),
      a: n("a", "root", { estimate: 5 }),
    };
    expect(effectiveEstimate(nodes, "root")).toBe(5);
  });
  it("parent + leaf child no estimate → 4 (leaf implicit 4h)", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a"] }),
      a: n("a", "root"),
    };
    expect(effectiveEstimate(nodes, "root")).toBe(4);
  });
  it("parent + two children with estimates 4,16 → 20", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a", "b"] }),
      a: n("a", "root", { estimate: 4 }),
      b: n("b", "root", { estimate: 16 }),
    };
    expect(effectiveEstimate(nodes, "root")).toBe(20);
  });
  it("parent + leaf1(estimate 4) + leaf2(no estimate) → 8", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a", "b"] }),
      a: n("a", "root", { estimate: 4 }),
      b: n("b", "root"),
    };
    expect(effectiveEstimate(nodes, "root")).toBe(8);
  });
});

describe("computeEstimates", () => {
  it("returns values for every node (leaf implicit 4h, non-leaf sums children)", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a", "b"] }),
      a: n("a", "root", { children: ["c"] }),
      b: n("b", "root", { estimate: 10 }),
      c: n("c", "a"),
    };
    const map = computeEstimates(nodes);
    expect(map.get("root")).toBe(14);
    expect(map.get("a")).toBe(4);
    expect(map.get("b")).toBe(10);
    expect(map.get("c")).toBe(4);
  });
});
