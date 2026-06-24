import { describe, expect, it } from "vitest";
import { parseDSL, parseInlineDSL, serializeDSL } from "./dsl";
import type { MindNode } from "./types";

describe("parseDSL — Mermaid mindmap", () => {
  it("parses a single root", () => {
    const r = parseDSL("mindmap\n  * Root\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.board.name).toBe("Root");
    expect(r!.nodes).toHaveLength(1);
    expect(r!.nodes[0].isRoot).toBe(true);
    expect(r!.nodes[0].text).toBe("Root");
  });

  it("parses child and grandchild via indentation", () => {
    const text = "mindmap\n  * Root\n    * Child\n      * Grand\n";
    const r = parseDSL(text, "b1")!;
    expect(r.nodes).toHaveLength(3);
    expect(r.nodes[1].parentId).toBe(r.nodes[0].id);
    expect(r.nodes[2].parentId).toBe(r.nodes[1].id);
  });

  it("parses multiple children at the same depth", () => {
    const text = "mindmap\n  * Root\n    * A\n    * B\n    * C\n";
    const r = parseDSL(text, "b1")!;
    expect(r.nodes.filter((n) => !n.isRoot)).toHaveLength(3);
  });

  it("parses attributes (@priority, @color, @due, @done, @status)", () => {
    const r = parseDSL(
      "mindmap\n  * X @priority:high @color:rose @due:2026-06-25 @status:wip\n",
      "b1",
    )!;
    const [n] = r.nodes;
    expect(n.priority).toBe("high");
    expect(n.categoryColor).toBe("rose");
    expect(n.dueDate).toBe("2026-06-25");
    expect(n.status).toBe("wip");
  });

  it("returns null when header is missing", () => {
    expect(parseDSL("  * Root\n", "b1")).toBeNull();
  });

  it("returns null when indent is invalid (tab or odd)", () => {
    expect(parseDSL("mindmap\n\t* Root\n", "b1")).toBeNull();
    expect(parseDSL("mindmap\n   * Root\n", "b1")).toBeNull();
  });

  it("returns null when no root exists", () => {
    expect(parseDSL("mindmap\n", "b1")).toBeNull();
  });

  it("returns null when multiple roots exist", () => {
    expect(parseDSL("mindmap\n  * A\n  * B\n", "b1")).toBeNull();
  });

  it("returns null on unknown attribute value", () => {
    expect(parseDSL("mindmap\n  * X @priority:urgent\n", "b1")).toBeNull();
    expect(parseDSL("mindmap\n  * X @color:purple\n", "b1")).toBeNull();
  });

  it("returns null on invalid due date", () => {
    expect(parseDSL("mindmap\n  * X @due:not-a-date\n", "b1")).toBeNull();
  });

  it("treats @done as status:done and completed:true", () => {
    const r = parseDSL("mindmap\n  * X @done\n", "b1")!;
    expect(r.nodes[0].status).toBe("done");
    expect(r.nodes[0].completed).toBe(true);
  });

  it("round-trips through serializeDSL", () => {
    const original: Record<string, MindNode> = {
      root: {
        id: "root",
        boardId: "b1",
        text: "Root",
        parentId: null,
        isRoot: true,
        completed: false,
        collapsed: false,
        priority: "medium",
        categoryColor: "slate",
        dueDate: "",
        status: "inbox",
        children: ["a", "b"],
        x: 0,
        y: 0,
      },
      a: {
        id: "a",
        boardId: "b1",
        text: "A",
        parentId: "root",
        isRoot: false,
        completed: false,
        collapsed: false,
        priority: "high",
        categoryColor: "rose",
        dueDate: "2026-06-25",
        status: "wip",
        children: [],
        x: 0,
        y: 0,
      },
      b: {
        id: "b",
        boardId: "b1",
        text: "B",
        parentId: "root",
        isRoot: false,
        completed: true,
        collapsed: false,
        priority: "medium",
        categoryColor: "slate",
        dueDate: "",
        status: "done",
        children: [],
        x: 0,
        y: 0,
      },
    };
    const out = serializeDSL({ name: "Root" }, original);
    const parsed = parseDSL(out, "b1")!;
    expect(parsed.nodes).toHaveLength(3);
    const a = parsed.nodes.find((n) => n.text === "A")!;
    expect(a.priority).toBe("high");
    expect(a.categoryColor).toBe("rose");
    expect(a.dueDate).toBe("2026-06-25");
    expect(a.status).toBe("wip");
    const b = parsed.nodes.find((n) => n.text === "B")!;
    expect(b.status).toBe("done");
    expect(b.completed).toBe(true);
  });
});

describe("parseInlineDSL (unchanged)", () => {
  it("parses inline attributes", () => {
    expect(parseInlineDSL("task @priority:high @done")).toEqual({
      text: "task",
      hasAnyAttribute: true,
      priority: "high",
      categoryColor: null,
      dueDate: null,
      completed: true,
      status: "done",
    });
  });
});
