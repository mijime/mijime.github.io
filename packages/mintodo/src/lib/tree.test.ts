import { describe, expect, it } from "vitest";
import type { MindNode } from "../types";
import { countDescendants, isKanbanVisible, isLeaf } from "./tree";

function n(id: string, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId: "b1",
    text: id,
    parentId: null,
    isRoot: id === "root",
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    status: "inbox",
    children: [],
    x: 0,
    y: 0,
    ...opts,
  };
}

describe("isLeaf", () => {
  it("returns true for a node with no children", () => {
    const nodes = { root: n("root"), a: n("a", { parentId: "root" }) };
    nodes.root = { ...nodes.root, children: ["a"] };
    expect(isLeaf(nodes, "a")).toBe(true);
  });

  it("returns false for a node with children", () => {
    const nodes = { root: n("root", { children: ["a"] }), a: n("a", { parentId: "root" }) };
    expect(isLeaf(nodes, "root")).toBe(false);
  });
});

describe("countDescendants", () => {
  it("returns 0/0 for a leaf", () => {
    const nodes = { a: n("a") };
    expect(countDescendants(nodes, "a")).toEqual({ total: 0, completed: 0 });
  });

  it("counts all descendants and completed descendants", () => {
    const nodes = {
      p: n("p", { children: ["a", "b"], completed: true }),
      a: n("a", { parentId: "p", completed: true }),
      b: n("b", { parentId: "p", completed: false }),
      gp: n("gp", { children: ["p"] }),
    };
    expect(countDescendants(nodes, "gp")).toEqual({ total: 3, completed: 2 });
  });
});

describe("isKanbanVisible", () => {
  it("returns false for the root", () => {
    const nodes = { root: n("root") };
    expect(isKanbanVisible(nodes, "root")).toBe(false);
  });

  it("returns true for a leaf", () => {
    const nodes = { root: n("root", { children: ["a"] }), a: n("a", { parentId: "root" }) };
    expect(isKanbanVisible(nodes, "a")).toBe(true);
  });

  it("returns true for a parent whose every leaf descendant is completed", () => {
    const nodes = {
      root: n("root", { children: ["p"] }),
      p: n("p", { parentId: "root", children: ["a", "b"], completed: true }),
      a: n("a", { parentId: "p", completed: true }),
      b: n("b", { parentId: "p", completed: true }),
    };
    expect(isKanbanVisible(nodes, "p")).toBe(true);
  });

  it("returns false for a parent with at least one non-completed leaf descendant", () => {
    const nodes = {
      root: n("root", { children: ["p"] }),
      p: n("p", { parentId: "root", children: ["a", "b"] }),
      a: n("a", { parentId: "p", completed: true }),
      b: n("b", { parentId: "p", completed: false }),
    };
    expect(isKanbanVisible(nodes, "p")).toBe(false);
  });
});
