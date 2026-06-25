import { describe, expect, it } from "vitest";
import { parseDSL, parseInlineDSL, serializeDSL } from "./dsl";
import type { MindNode } from "./types";

describe("parseDSL — new Markdown format", () => {
  it("parses a heading line: # foo → depth 0 child of root", () => {
    const r = parseDSL("# foo\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rootText).toBe("");
    const nodes = Object.values(r.nodes);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].text).toBe("foo");
  });

  it("heading depth mapping: ## → depth 1, ### → depth 2", () => {
    const r = parseDSL("# a\n## b\n### c\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const b = Object.values(r.nodes).find((n) => n.text === "b")!;
    expect(b.parentId).toBe("a");
    const c = Object.values(r.nodes).find((n) => n.text === "c")!;
    expect(c.parentId).toBe(b.id);
  });

  it("checkbox line: - [ ] foo → inbox status", () => {
    const r = parseDSL("- [ ] foo\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [n] = Object.values(r.nodes);
    expect(n.text).toBe("foo");
    expect(n.status).toBe("inbox");
    expect(n.completed).toBe(false);
  });

  it("status glyphs: [-] wip, [|] review, [x] done", () => {
    const src = "- [-] wip\n- [|] review\n- [x] done\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const nodes = Object.values(r.nodes);
    expect(nodes.find((n) => n.text === "wip")!.status).toBe("wip");
    expect(nodes.find((n) => n.text === "review")!.status).toBe("review");
    expect(nodes.find((n) => n.text === "done")!.status).toBe("done");
    expect(nodes.find((n) => n.text === "done")!.completed).toBe(true);
  });

  it("indentation-based depth: 2 spaces per level", () => {
    const src = "- [ ] root\n  - [ ] child\n    - [ ] grand\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const child = Object.values(r.nodes).find((n) => n.text === "child")!;
    const grand = Object.values(r.nodes).find((n) => n.text === "grand")!;
    expect(child.parentId).toBe("root");
    expect(grand.parentId).toBe(child.id);
  });

  it("depth 3+ forces checkbox even with children (no error)", () => {
    const src = "- [ ] l1\n  - [ ] l2\n    - [ ] l3\n      - [ ] l4\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(true);
  });

  it("work log without timestamp: - foo → entry with Date.now() timestamp", () => {
    const before = Date.now();
    const src = "# task\n  - did something\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = Object.values(r.nodes).find((n) => n.text === "task")!;
    expect(task.workLogs).toHaveLength(1);
    expect(task.workLogs[0].text).toBe("did something");
    expect(task.workLogs[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it("work log with timestamp: - YYYY-MM-DD HH:MM: text", () => {
    const src = "# task\n  - 2026-06-25 14:30: Did X\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = Object.values(r.nodes).find((n) => n.text === "task")!;
    expect(task.workLogs).toHaveLength(1);
    expect(task.workLogs[0].text).toBe("Did X");
    const d = new Date(2026, 5, 25, 14, 30);
    expect(task.workLogs[0].timestamp).toBe(d.getTime());
  });

  it("work log depth must equal taskDepth + 1 (error otherwise)", () => {
    const src = "- [ ] task\n    - wrong depth\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("作業履歴のインデントが不正です");
  });

  it("work log without a preceding task is rejected", () => {
    const src = "- orphan log\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("作業履歴の前にタスクが見当たりません");
  });

  it("work log body after timestamp prefix is not parsed for attributes", () => {
    const src = "# task\n  - 2026-06-25 10:00: @priority:high note\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = Object.values(r.nodes).find((n) => n.text === "task")!;
    expect(task.workLogs[0].text).toBe("@priority:high note");
  });

  it("comments: ## this is a comment is ignored", () => {
    const src = "# real\n##this is a comment\n  - [ ] child\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.nodes)).toHaveLength(2);
  });

  it("tabs in indentation are rejected", () => {
    const src = "# a\n\t- [ ] b\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("タブ文字");
  });

  it("invalid status glyph: - [?] foo → error", () => {
    const src = "- [?] foo\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("チェックボックス");
  });

  it("invalid work log timestamp → error", () => {
    const src = "- [ ] task\n  - 2026-13-99 25:99: foo\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("タイムスタンプ");
  });

  it("attributes inline: @priority:high @due:2026-12-31", () => {
    const src = "- [ ] foo @priority:high @due:2026-12-31\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [n] = Object.values(r.nodes);
    expect(n.priority).toBe("high");
    expect(n.dueDate).toBe("2026-12-31");
  });

  it("@estimate:8 sets estimate field", () => {
    const src = "- [ ] foo @estimate:8\n";
    const r = parseDSL(src, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [n] = Object.values(r.nodes);
    expect(n.estimate).toBe(8);
  });

  it("empty input → error 'トップレベル要素がありません'", () => {
    const r = parseDSL("", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("トップレベル要素がありません");
  });

  it("round-trip preserves work log entries in order", () => {
    const src = "# Task\n  - 2026-06-25 10:00: First\n  - 2026-06-25 11:00: Second\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const serialized = serializeDSL(r1.nodes);
    const r2 = parseDSL(serialized, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const task1 = Object.values(r1.nodes).find((n) => n.text === "Task")!;
    const task2 = Object.values(r2.nodes).find((n) => n.text === "Task")!;
    expect(task2.workLogs).toHaveLength(2);
    expect(task2.workLogs[0].text).toBe(task1.workLogs[0].text);
    expect(task2.workLogs[1].text).toBe(task1.workLogs[1].text);
  });
});

describe("parseInlineDSL", () => {
  it("parses @estimate:8", () => {
    const r = parseInlineDSL("task @estimate:8");
    expect(r.estimate).toBe(8);
  });
  it("@estimate:0 is null", () => {
    expect(parseInlineDSL("task @estimate:0").estimate).toBeNull();
  });
});

describe("serializeDSL", () => {
  it("serializes heading at depth 0 with children", () => {
    const nodes: Record<string, MindNode> = {
      root: { id: "root", boardId: "b1", text: "", parentId: null, isRoot: true, completed: false, collapsed: false, priority: "medium", categoryColor: "slate", dueDate: "", status: "inbox", children: ["a"], x: 0, y: 0, estimate: null, workLogs: [] },
      a: { id: "a", boardId: "b1", text: "Section", parentId: "root", isRoot: false, completed: false, collapsed: false, priority: "medium", categoryColor: "slate", dueDate: "", status: "inbox", children: ["b"], x: 0, y: 0, estimate: null, workLogs: [] },
      b: { id: "b", boardId: "b1", text: "Task", parentId: "a", isRoot: false, completed: true, collapsed: false, priority: "medium", categoryColor: "slate", dueDate: "", status: "done", children: [], x: 0, y: 0, estimate: null, workLogs: [] },
    };
    const out = serializeDSL(nodes);
    expect(out).toContain("# Section");
    expect(out).toContain("- [x] Task");
  });

  it("includes work log lines after the parent task", () => {
    const nodes: Record<string, MindNode> = {
      root: { id: "root", boardId: "b1", text: "", parentId: null, isRoot: true, completed: false, collapsed: false, priority: "medium", categoryColor: "slate", dueDate: "", status: "inbox", children: ["a"], x: 0, y: 0, estimate: null, workLogs: [] },
      a: { id: "a", boardId: "b1", text: "Task", parentId: "root", isRoot: false, completed: false, collapsed: false, priority: "medium", categoryColor: "slate", dueDate: "", status: "inbox", children: [], x: 0, y: 0, estimate: null, workLogs: [{ id: "wl1", timestamp: new Date(2026, 5, 25, 10, 0).getTime(), text: "Did X" }] },
    };
    const out = serializeDSL(nodes);
    expect(out).toContain("2026-06-25 10:00: Did X");
  });
});
