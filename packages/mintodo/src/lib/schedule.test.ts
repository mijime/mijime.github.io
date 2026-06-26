import { describe, expect, it } from "vitest";
import type { MindNode } from "../types";
import { addHours, scheduleNodes } from "./schedule";

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
    startDate: "",
    status: "inbox",
    children: opts.children ?? [],
    x: 0,
    y: 0,
    estimate: opts.estimate ?? null,
    workLogs: [],
    ...opts,
  };
}

describe("per-node @start", () => {
  it("leaf with @start is positioned at that date, not epoch", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a"] }),
      a: n("a", "root", { estimate: 4, startDate: "2026-07-01" }),
    };
    const r = scheduleNodes(nodes);
    const a_s = r.find((s) => s.id === "a")!;
    const startOrigin = new Date("2026-07-01T00:00:00").getTime();
    expect(a_s.start.getTime()).toBe(startOrigin);
    expect(a_s.end.getTime()).toBe(startOrigin + 4 * 3_600_000);
  });

  it("sibling without @start uses default origin, independent of @start sibling", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a", "b"] }),
      a: n("a", "root", { estimate: 4, startDate: "2026-07-01" }),
      b: n("b", "root", { estimate: 4 }),
    };
    const r = scheduleNodes(nodes);
    const a_s = r.find((s) => s.id === "a")!;
    const b_s = r.find((s) => s.id === "b")!;
    // A at 2026-07-01
    const startA = new Date("2026-07-01T00:00:00").getTime();
    expect(a_s.start.getTime()).toBe(startA);
    expect(a_s.end.getTime()).toBe(startA + 4 * 3_600_000);
    // B at epoch (independent, cursor not advanced by A)
    expect(b_s.start.getTime()).toBe(0);
    expect(b_s.end.getTime()).toBe(4 * 3_600_000);
  });

  it("two @start siblings are independently positioned", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a", "b"] }),
      a: n("a", "root", { estimate: 4, startDate: "2026-01-01" }),
      b: n("b", "root", { estimate: 4, startDate: "2026-06-01" }),
    };
    const r = scheduleNodes(nodes);
    const a_s = r.find((s) => s.id === "a")!;
    const b_s = r.find((s) => s.id === "b")!;
    const startA = new Date("2026-01-01T00:00:00").getTime();
    const startB = new Date("2026-06-01T00:00:00").getTime();
    expect(a_s.start.getTime()).toBe(startA);
    // B starts at its own @start, independent of A (not pushed after A's end)
    expect(b_s.start.getTime()).toBe(startB);
  });

  it("children inherit parent @start for sequential scheduling", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a"] }),
      a: n("a", "root", { startDate: "2026-07-01", children: ["a1", "a2"] }),
      a1: n("a1", "a", { estimate: 4 }),
      a2: n("a2", "a", { estimate: 4 }),
    };
    const r = scheduleNodes(nodes);
    const a1_s = r.find((s) => s.id === "a1")!;
    const a2_s = r.find((s) => s.id === "a2")!;
    const a_s = r.find((s) => s.id === "a")!;
    const startOrigin = new Date("2026-07-01T00:00:00").getTime();
    expect(a1_s.start.getTime()).toBe(startOrigin);
    expect(a1_s.end.getTime()).toBe(startOrigin + 4 * 3_600_000);
    expect(a2_s.start.getTime()).toBe(startOrigin + 4 * 3_600_000);
    expect(a2_s.end.getTime()).toBe(startOrigin + 8 * 3_600_000);
    expect(a_s.start.getTime()).toBe(startOrigin);
    expect(a_s.end.getTime()).toBe(startOrigin + 8 * 3_600_000);
  });

  it("child @start overrides parent @start within subtree", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a"] }),
      a: n("a", "root", { startDate: "2026-01-01", children: ["b", "c"] }),
      b: n("b", "a", { startDate: "2026-02-01", estimate: 4 }),
      c: n("c", "a", { estimate: 4 }),
    };
    const r = scheduleNodes(nodes);
    const b_s = r.find((s) => s.id === "b")!;
    const c_s = r.find((s) => s.id === "c")!;
    const a_s = r.find((s) => s.id === "a")!;
    const startA = new Date("2026-01-01T00:00:00").getTime();
    const startB = new Date("2026-02-01T00:00:00").getTime();
    // B at its own @start
    expect(b_s.start.getTime()).toBe(startB);
    expect(b_s.end.getTime()).toBe(startB + 4 * 3_600_000);
    // C at parent's origin (A's @start), independent of B
    expect(c_s.start.getTime()).toBe(startA);
    expect(c_s.end.getTime()).toBe(startA + 4 * 3_600_000);
    // A spans both independent subtrees
    expect(a_s.start.getTime()).toBe(startA);
    expect(a_s.end.getTime()).toBe(Math.max(startB + 4 * 3_600_000, startA + 4 * 3_600_000));
  });
});

describe("addHours", () => {
  it("0 hours → copy", () => {
    const d = new Date(2026, 5, 25, 10, 0);
    expect(addHours(d, 0).getTime()).toBe(d.getTime());
  });
  it("adds hours forward", () => {
    const d = new Date(0);
    const r = addHours(d, 4);
    expect(r.getTime()).toBe(4 * 3_600_000);
  });
  it("adds hours backward", () => {
    const d = new Date(10 * 3_600_000);
    const r = addHours(d, -3);
    expect(r.getTime()).toBe(7 * 3_600_000);
  });
  it("24h continuous — no day boundary clamp", () => {
    const d = new Date(20 * 3_600_000);
    const r = addHours(d, 10);
    expect(r.getTime()).toBe(30 * 3_600_000);
  });
});

describe("scheduleNodes", () => {
  it("empty → []", () => expect(scheduleNodes({})).toEqual([]));
  it("single leaf root 4h → one entry from epoch", () => {
    const nodes = { root: n("root", null, { isRoot: true, estimate: 4 }) };
    const r = scheduleNodes(nodes);
    expect(r).toHaveLength(1);
    expect(r[0].start.getTime()).toBe(0);
    expect(r[0].end.getTime()).toBe(4 * 3_600_000);
    expect(r[0].isLeaf).toBe(true);
  });
  it("parent span wraps child (hierarchical)", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a"] }),
      a: n("a", "root", { estimate: 4 }),
    };
    const r = scheduleNodes(nodes);
    expect(r).toHaveLength(2);
    const child = r.find((s) => s.id === "a")!;
    const parent = r.find((s) => s.id === "root")!;
    expect(child.start.getTime()).toBe(0);
    expect(child.end.getTime()).toBe(4 * 3_600_000);
    expect(parent.start.getTime()).toBe(child.start.getTime());
    expect(parent.end.getTime()).toBe(child.end.getTime());
    expect(child.isLeaf).toBe(true);
    expect(parent.isLeaf).toBe(false);
  });
  it("siblings advance cursor sequentially", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a", "b"] }),
      a: n("a", "root", { estimate: 4 }),
      b: n("b", "root", { estimate: 2 }),
    };
    const r = scheduleNodes(nodes);
    const a = r.find((s) => s.id === "a")!;
    const b = r.find((s) => s.id === "b")!;
    expect(a.start.getTime()).toBe(0);
    expect(a.end.getTime()).toBe(4 * 3_600_000);
    expect(b.start.getTime()).toBe(4 * 3_600_000);
    expect(b.end.getTime()).toBe(6 * 3_600_000);
    expect(a.isLeaf).toBe(true);
    expect(b.isLeaf).toBe(true);
  });
  it("non-leaf with explicit estimate carries plannedEstimateH", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, estimate: 10, children: ["a"] }),
      a: n("a", "root", { estimate: 4 }),
    };
    const r = scheduleNodes(nodes);
    const parent = r.find((s) => s.id === "root")!;
    expect(parent.plannedEstimateH).toBe(10);
    expect(parent.estimateH).toBe(4);
    expect(parent.isLeaf).toBe(false);
  });
  it("4h estimate leaf → bar width 4h", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, estimate: 4 }),
    };
    const r = scheduleNodes(nodes);
    expect(r[0].estimateH).toBe(4);
  });
  it("nested children: parent span covers min(start)..max(end)", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a"] }),
      a: n("a", "root", { children: ["b", "c"] }),
      b: n("b", "a", { estimate: 2 }),
      c: n("c", "a", { estimate: 3 }),
    };
    const r = scheduleNodes(nodes);
    const parent = r.find((s) => s.id === "root")!;
    const childA = r.find((s) => s.id === "a")!;
    const childB = r.find((s) => s.id === "b")!;
    const childC = r.find((s) => s.id === "c")!;
    // B ends at epoch+2h, c ends at epoch+2h+3h=epoch+5h
    expect(childB.start.getTime()).toBe(0);
    expect(childB.end.getTime()).toBe(2 * 3_600_000);
    expect(childC.start.getTime()).toBe(2 * 3_600_000);
    expect(childC.end.getTime()).toBe(5 * 3_600_000);
    // Parent a spans b..c = 0..5h
    expect(childA.start.getTime()).toBe(0);
    expect(childA.end.getTime()).toBe(5 * 3_600_000);
    // Grandparent root spans same
    expect(parent.start.getTime()).toBe(0);
    expect(parent.end.getTime()).toBe(5 * 3_600_000);
  });
  it("completed leaf → 0h, cursor unchanged", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a", "b"] }),
      a: n("a", "root", { estimate: 4, completed: true }),
      b: n("b", "root", { estimate: 4 }),
    };
    const r = scheduleNodes(nodes);
    const a_s = r.find((s) => s.id === "a")!;
    const b_s = r.find((s) => s.id === "b")!;
    // A: 0h → start=end=0, cursor stays 0
    expect(a_s.start.getTime()).toBe(0);
    expect(a_s.end.getTime()).toBe(0);
    expect(a_s.estimateH).toBe(0);
    // B: 4h, starts at 0 (cursor didn't advance after a)
    expect(b_s.start.getTime()).toBe(0);
    expect(b_s.end.getTime()).toBe(4 * 3_600_000);
  });
  it("completed parent → all descendants 0h", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["a", "b"] }),
      a: n("a", "root", { children: ["c", "d"], completed: true }),
      b: n("b", "root", { estimate: 4 }),
      c: n("c", "a", { estimate: 8 }),
      d: n("d", "a", { estimate: 2 }),
    };
    const r = scheduleNodes(nodes);
    const a_s = r.find((s) => s.id === "a")!;
    const c_s = r.find((s) => s.id === "c")!;
    const d_s = r.find((s) => s.id === "d")!;
    const b_s = r.find((s) => s.id === "b")!;
    // A (completed parent) → 0h span
    expect(a_s.estimateH).toBe(0);
    expect(a_s.start.getTime()).toBe(0);
    expect(a_s.end.getTime()).toBe(0);
    // C, d (under completed parent) → 0h
    expect(c_s.estimateH).toBe(0);
    expect(d_s.estimateH).toBe(0);
    // B (sibling, not completed) → starts at 0, takes 4h
    expect(b_s.start.getTime()).toBe(0);
    expect(b_s.end.getTime()).toBe(4 * 3_600_000);
  });
  it("phase scenario: done phases don't advance cursor for next phase", () => {
    // Phase 1 (done) + Phase 2 (done) + Phase 3 (wip)
    // Phase 3 should start at 0h
    const nodes = {
      root: n("root", null, { isRoot: true, children: ["p1", "p2", "p3"] }),
      p1: n("p1", "root", {
        estimate: 48,
        children: ["p1a", "p1b", "p1c"],
        completed: true,
      }),
      p1a: n("p1a", "p1", { estimate: 16, completed: true }),
      p1b: n("p1b", "p1", { estimate: 8, completed: true }),
      p1c: n("p1c", "p1", { estimate: 24, completed: true }),
      p2: n("p2", "root", {
        estimate: 20,
        children: ["p2a", "p2b"],
        completed: true,
      }),
      p2a: n("p2a", "p2", { estimate: 4, completed: true }),
      p2b: n("p2b", "p2", { estimate: 16, completed: true }),
      p3: n("p3", "root", { estimate: 40, children: ["p3a"], status: "wip" }),
      p3a: n("p3a", "p3", { estimate: 40 }),
    };
    const r = scheduleNodes(nodes);
    const p3 = r.find((s) => s.id === "p3")!;
    const p3a = r.find((s) => s.id === "p3a")!;
    // Phase 3 starts at 0h (completed phases contribute 0h)
    expect(p3.start.getTime()).toBe(0);
    expect(p3a.start.getTime()).toBe(0);
    expect(p3a.end.getTime()).toBe(40 * 3_600_000);
  });
  it("weekend crossover → continuous (no gap)", () => {
    // 100h task starts from epoch — should end exactly 100h later
    const nodes = {
      root: n("root", null, { isRoot: true, estimate: 100 }),
    };
    const r = scheduleNodes(nodes);
    const hours = (r[0].end.getTime() - r[0].start.getTime()) / 3_600_000;
    expect(hours).toBe(100);
  });
});
