import { describe, expect, it } from "vitest";
import type { MindNode } from "./types";
import { parseDSL } from "./dsl";

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

  it("returns null on +4 indent jump", () => {
    expect(parseDSL("Root\n      Child\n", "b1")).toBeNull();
  });

  it("returns null on -4 indent jump", () => {
    expect(parseDSL("Root\n  A\n      B\n", "b1")).toBeNull();
  });

  it("returns null on empty text after stripping", () => {
    expect(parseDSL("Root\n  @priority:high\n", "b1")).toBeNull();
  });

  it("preserves single-word text", () => {
    const r = parseDSL("Root\n  Child\n", "b1");
    expect(r).not.toBeNull();
    expect(r!.nodes[1].text).toBe("Child");
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
