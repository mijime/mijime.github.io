import { describe, expect, it } from "vitest";
import type { MindNode } from "./types";
import { parseDSL, parseInlineDSL, serializeDSL } from "./dsl";

function findNode(nodes: MindNode[], id: string): MindNode {
  const n = nodes.find((x) => x.id === id);
  if (!n) throw new Error(`node ${id} not found`);
  return n;
}

function root(nodes: MindNode[]): MindNode {
  return findNode(nodes, "root");
}

describe("parseDSL — structure", () => {
  it("parses root only", () => {
    const r = parseDSL("買い物リスト\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.board).toEqual({ id: "b1", name: "買い物リスト" });
    expect(r!.nodes).toHaveLength(1);
    expect(root(r!.nodes).text).toBe("買い物リスト");
    expect(root(r!.nodes).isRoot).toBe(true);
    expect(root(r!.nodes).children).toEqual([]);
  });

  it("parses root and one child", () => {
    const r = parseDSL("買い物リスト\n  牛乳\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
    expect(root(r!.nodes).children).toHaveLength(1);
    const child = r!.nodes.find((n) => n.text === "牛乳")!;
    expect(child.parentId).toBe("root");
  });

  it("parses deep nesting", () => {
    const text = "A\n  B\n    C\n      D\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(4);
    const d = findNode(r!.nodes, "n2");
    expect(d.parentId).toBe("n1");
  });

  it("parses siblings at same level", () => {
    const text = "Root\n  A\n  B\n  C\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(root(r!.nodes).children).toHaveLength(3);
  });

  it("ignores comment lines", () => {
    const text = "# header\nRoot\n  # child comment\n  Child\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
  });

  it("ignores blank lines", () => {
    const text = "Root\n\n  A\n\n  B\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(3);
  });

  it("accepts CRLF line endings", () => {
    const text = "Root\r\n  Child\r\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
  });

  it("returns null when no root line", () => {
    expect(parseDSL("\n  Child\n", "b1")).toBeNull();
    expect(parseDSL("", "b1")).toBeNull();
  });

  it("returns null on tab character", () => {
    expect(parseDSL("Root\n\tChild\n", "b1")).toBeNull();
  });

  it("returns null on non-2-multiple indent", () => {
    expect(parseDSL("Root\n   Child\n", "b1")).toBeNull();
  });

  it("allows +4 indent jump (deep child of root)", () => {
    const r = parseDSL("Root\n        DeepChild\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
    const child = r!.nodes.find((n) => n.text === "DeepChild")!;
    expect(child.parentId).toBe("root");
  });

  it("allows -4 indent jump (sibling of grandchild back at root level)", () => {
    const r = parseDSL("Root\n  A\n      B\n  C\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(4);
    const c = r!.nodes.find((n) => n.text === "C")!;
    expect(c.parentId).toBe("root");
    const b = r!.nodes.find((n) => n.text === "B")!;
    expect(b.parentId).toBe("n0");
  });

  it("returns null on empty text after stripping", () => {
    expect(parseDSL("Root\n  @priority:high\n", "b1")).toBeNull();
  });

  it("preserves single-word text", () => {
    const r = parseDSL("Root\n  Child\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes[1].text).toBe("Child");
  });

  it("allows -2 indent jump: user's task1/tasks1-1/tasks1-1-1/hello + task1-2 case", () => {
    const text = "task1\n" + "  tasks1-1\n" + "    tasks1-1-1\n" + "      hello\n" + "  task1-2\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(5);
    const task1 = root(r!.nodes);
    expect(task1.children).toHaveLength(2);
    const tasks1_1 = r!.nodes.find((n) => n.text === "tasks1-1")!;
    const task1_2 = r!.nodes.find((n) => n.text === "task1-2")!;
    expect(tasks1_1.parentId).toBe("root");
    expect(task1_2.parentId).toBe("root");
    const tasks1_1_1 = r!.nodes.find((n) => n.text === "tasks1-1-1")!;
    expect(tasks1_1_1.parentId).toBe(tasks1_1.id);
    const hello = r!.nodes.find((n) => n.text === "hello")!;
    expect(hello.parentId).toBe(tasks1_1_1.id);
  });

  it("allows -3 indent jump: deep subtree then back to root level", () => {
    const text = "A\n  B\n    C\n      D\n  E\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(5);
    const a = root(r!.nodes);
    const e = r!.nodes.find((n) => n.text === "E")!;
    expect(e.parentId).toBe(a.id);
    const b = r!.nodes.find((n) => n.text === "B")!;
    expect(b.parentId).toBe(a.id);
  });

  it("allows arbitrary +N indent: deep child from root", () => {
    const text = "A\n            B\n";
    const r = parseDSL(text, "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes).toHaveLength(2);
    const b = r!.nodes.find((n) => n.text === "B")!;
    expect(b.parentId).toBe("root");
  });

  it("returns null on a second depth-0 line (multiple roots)", () => {
    expect(parseDSL("Root\nOther\n", "b1")).toBeNull();
  });
});

describe("parseDSL — attributes", () => {
  it("parses @priority:high", () => {
    const r = parseDSL("Root\n  牛乳 @priority:high\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "牛乳")!;
    expect(child.priority).toBe("high");
  });

  it("parses @color:sky", () => {
    const r = parseDSL("Root\n  パン @color:sky\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "パン")!;
    expect(child.categoryColor).toBe("sky");
  });

  it("parses @due:YYYY-MM-DD", () => {
    const r = parseDSL("Root\n  期限タスク @due:2026-06-25\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "期限タスク")!;
    expect(child.dueDate).toBe("2026-06-25");
  });

  it("parses @done", () => {
    const r = parseDSL("Root\n  完了済み @done\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "完了済み")!;
    expect(child.completed).toBe(true);
  });

  it("parses multiple attributes", () => {
    const r = parseDSL("Root\n  X @done @priority:high @color:emerald @due:2026-01-01\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "X")!;
    expect(child.completed).toBe(true);
    expect(child.priority).toBe("high");
    expect(child.categoryColor).toBe("emerald");
    expect(child.dueDate).toBe("2026-01-01");
  });

  it("ignores unknown attributes", () => {
    const r = parseDSL("Root\n  X @foo:bar @priority:low\n", "b1")!;
    const child = r.nodes.find((n) => n.text === "X")!;
    expect(child.priority).toBe("low");
  });

  it("returns null on invalid priority", () => {
    expect(parseDSL("Root\n  X @priority:urgent\n", "b1")).toBeNull();
  });

  it("returns null on invalid color", () => {
    expect(parseDSL("Root\n  X @color:purple\n", "b1")).toBeNull();
  });

  it("returns null on invalid due date", () => {
    expect(parseDSL("Root\n  X @due:2026/06/25\n", "b1")).toBeNull();
    expect(parseDSL("Root\n  X @due:not-a-date\n", "b1")).toBeNull();
  });
});

function makeNode(id: string, boardId: string, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId,
    text: opts.text ?? "node",
    parentId: opts.parentId ?? null,
    isRoot: opts.isRoot ?? false,
    completed: opts.completed ?? false,
    collapsed: false,
    priority: opts.priority ?? "medium",
    categoryColor: opts.categoryColor ?? "slate",
    dueDate: opts.dueDate ?? "",
    children: opts.children ?? [],
    x: 0,
    y: 0,
  };
}

function fromArray(arr: MindNode[]): Record<string, MindNode> {
  const rec: Record<string, MindNode> = {};
  for (const n of arr) rec[n.id] = n;
  return rec;
}

describe("serializeDSL", () => {
  it("serializes root only", () => {
    const out = serializeDSL(
      { name: "Board" },
      { root: makeNode("root", "b1", { isRoot: true, text: "Board" }) },
    );
    expect(out).toBe("Board\n");
  });

  it("serializes parent + child", () => {
    const out = serializeDSL(
      { name: "B" },
      {
        root: makeNode("root", "b1", { isRoot: true, text: "B", children: ["c1"] }),
        c1: makeNode("c1", "b1", { text: "Child", parentId: "root" }),
      },
    );
    expect(out).toBe("B\n  Child\n");
  });

  it("emits attributes in fixed order: priority, color, due, done", () => {
    const out = serializeDSL(
      { name: "B" },
      {
        root: makeNode("root", "b1", { isRoot: true, text: "B", children: ["c1"] }),
        c1: makeNode("c1", "b1", {
          text: "X",
          parentId: "root",
          priority: "high",
          categoryColor: "emerald",
          dueDate: "2026-01-01",
          completed: true,
        }),
      },
    );
    expect(out).toBe("B\n  X @priority:high @color:emerald @due:2026-01-01 @done\n");
  });

  it("omits default attributes", () => {
    const out = serializeDSL(
      { name: "B" },
      {
        root: makeNode("root", "b1", { isRoot: true, text: "B", children: ["c1"] }),
        c1: makeNode("c1", "b1", { text: "X", parentId: "root" }),
      },
    );
    expect(out).toBe("B\n  X\n");
  });

  it("roundtrips: serialize -> parse -> serialize is stable", () => {
    const original: Record<string, MindNode> = {
      root: makeNode("root", "b1", { isRoot: true, text: "Board", children: ["a", "b"] }),
      a: makeNode("a", "b1", {
        text: "A",
        parentId: "root",
        priority: "high",
        categoryColor: "sky",
        children: ["a1"],
      }),
      a1: makeNode("a1", "b1", { text: "A1", parentId: "a", completed: true }),
      b: makeNode("b", "b1", { text: "B", parentId: "root", dueDate: "2026-12-31" }),
    };
    const dsl = serializeDSL({ name: "Board" }, original);
    const parsed = parseDSL(dsl, "b1")!;
    const reserialized = serializeDSL({ name: parsed.board.name }, fromArray(parsed.nodes));
    expect(reserialized).toBe(dsl);

    for (const n of parsed.nodes) {
      expect(n.x).toBe(0);
      expect(n.y).toBe(0);
    }
  });
});

describe("parseInlineDSL", () => {
  it("returns empty result for empty string", () => {
    expect(parseInlineDSL("")).toEqual({
      text: "",
      hasAnyAttribute: false,
      priority: null,
      categoryColor: null,
      dueDate: null,
      completed: null,
    });
  });

  it("returns empty result for whitespace-only string", () => {
    expect(parseInlineDSL("   ")).toEqual({
      text: "",
      hasAnyAttribute: false,
      priority: null,
      categoryColor: null,
      dueDate: null,
      completed: null,
    });
  });

  it("returns plain text without attributes", () => {
    expect(parseInlineDSL("hello")).toEqual({
      text: "hello",
      hasAnyAttribute: false,
      priority: null,
      categoryColor: null,
      dueDate: null,
      completed: null,
    });
  });

  it("extracts @priority:high", () => {
    const r = parseInlineDSL("hello @priority:high");
    expect(r.text).toBe("hello");
    expect(r.hasAnyAttribute).toBe(true);
    expect(r.priority).toBe("high");
  });

  it("extracts @done as completed flag", () => {
    const r = parseInlineDSL("buy milk @done");
    expect(r.text).toBe("buy milk");
    expect(r.hasAnyAttribute).toBe(true);
    expect(r.completed).toBe(true);
  });

  it("extracts multiple attributes", () => {
    const r = parseInlineDSL("task @priority:high @color:sky @done @due:2026-06-25");
    expect(r.text).toBe("task");
    expect(r.priority).toBe("high");
    expect(r.categoryColor).toBe("sky");
    expect(r.completed).toBe(true);
    expect(r.dueDate).toBe("2026-06-25");
    expect(r.hasAnyAttribute).toBe(true);
  });

  it("keeps invalid @priority:urgent as text", () => {
    const r = parseInlineDSL("hello @priority:urgent");
    expect(r.text).toBe("hello @priority:urgent");
    expect(r.priority).toBeNull();
    expect(r.hasAnyAttribute).toBe(false);
  });

  it("keeps invalid @color:purple as text", () => {
    const r = parseInlineDSL("hello @color:purple");
    expect(r.text).toBe("hello @color:purple");
    expect(r.categoryColor).toBeNull();
    expect(r.hasAnyAttribute).toBe(false);
  });

  it("keeps invalid @due as text", () => {
    const r = parseInlineDSL("hello @due:notadate");
    expect(r.text).toBe("hello @due:notadate");
    expect(r.dueDate).toBeNull();
    expect(r.hasAnyAttribute).toBe(false);
  });

  it("keeps unknown @foo:bar as text", () => {
    const r = parseInlineDSL("hello @foo:bar");
    expect(r.text).toBe("hello @foo:bar");
    expect(r.hasAnyAttribute).toBe(false);
  });

  it("handles text that is only attributes", () => {
    const r = parseInlineDSL("@priority:high");
    expect(r.text).toBe("");
    expect(r.hasAnyAttribute).toBe(true);
    expect(r.priority).toBe("high");
  });

  it("joins multi-word text with single spaces", () => {
    const r = parseInlineDSL("foo   bar  baz @priority:high");
    expect(r.text).toBe("foo bar baz");
    expect(r.priority).toBe("high");
  });
});
