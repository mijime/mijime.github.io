import { describe, expect, it } from "vitest";
import type { MindNode } from "../types";
import { buildBreadcrumb, parentBreadcrumb } from "./breadcrumb";

function n(id: string, parentId: string | null, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId: "b1",
    text: opts.text ?? id,
    parentId,
    isRoot: parentId === null,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    status: "inbox",
    children: opts.children ?? [],
    estimate: null,
    workLogs: [],
    x: 0,
    y: 0,
    ...opts,
    startDate: opts.startDate ?? "",
  };
}

describe("buildBreadcrumb", () => {
  it("returns '' when targetId is not in nodes", () => {
    expect(buildBreadcrumb({}, "missing")).toBe("");
  });

  it("returns just the root text when the target is the root", () => {
    const nodes = { root: n("root", null, { isRoot: true, text: "My Board" }) };
    expect(buildBreadcrumb(nodes, "root")).toBe("My Board");
  });

  it("joins 2 levels with ' / '", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, text: "R", children: ["a"] }),
      a: n("a", "root", { text: "A" }),
    };
    expect(buildBreadcrumb(nodes, "a")).toBe("R / A");
  });

  it("joins 3 levels with ' / ' (no truncation)", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, text: "R", children: ["a"] }),
      a: n("a", "root", { text: "A", children: ["b"] }),
      b: n("b", "a", { text: "B" }),
    };
    expect(buildBreadcrumb(nodes, "b")).toBe("R / A / B");
  });

  it("returns full path when 4 levels deep (no JS truncation; CSS handles ellipsis)", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, text: "R", children: ["a"] }),
      a: n("a", "root", { text: "A", children: ["b"] }),
      b: n("b", "a", { text: "B", children: ["c"] }),
      c: n("c", "b", { text: "C" }),
    };
    expect(buildBreadcrumb(nodes, "c")).toBe("R / A / B / C");
  });

  it("returns full path when 5+ levels deep (no JS truncation; CSS handles ellipsis)", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, text: "R", children: ["a"] }),
      a: n("a", "root", { text: "A", children: ["b"] }),
      b: n("b", "a", { text: "B", children: ["c"] }),
      c: n("c", "b", { text: "C", children: ["d"] }),
      d: n("d", "c", { text: "D" }),
    };
    expect(buildBreadcrumb(nodes, "d")).toBe("R / A / B / C / D");
  });

  it("returns the collected prefix when the parent chain is broken mid-walk", () => {
    const nodes = { a: n("a", "missing-parent", { text: "A" }) };
    expect(buildBreadcrumb(nodes, "a")).toBe("A");
  });
});

describe("parentBreadcrumb", () => {
  it("depth-1 node → parent breadcrumb (Root)", () => {
    const nodes = {
      root: n("root", null, { isRoot: true, text: "Root", children: ["a"] }),
      a: n("a", "root", { text: "Child" }),
    };
    expect(parentBreadcrumb(nodes, "a")).toBe("Root");
  });
  it("root → root's own text", () => {
    expect(
      parentBreadcrumb({ root: n("root", null, { isRoot: true, text: "My Board" }) }, "root"),
    ).toBe("My Board");
  });
  it("missing id → ''", () => expect(parentBreadcrumb({}, "missing")).toBe(""));
});
