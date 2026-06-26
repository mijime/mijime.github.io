import { describe, expect, it } from "vitest";
import { parseDSL, parseInlineDSL, serializeDSL } from "./dsl";
import type { MindNode } from "./types";

function findNode(nodes: Record<string, MindNode>, text: string): MindNode {
  const n = Object.values(nodes).find((x) => x.text === text);
  if (!n) throw new Error(`node "${text}" not found`);
  return n;
}

describe("parseDSL — indented-text DSL", () => {
  it("empty input → error", () => {
    const r = parseDSL("", "b1");
    expect(r.ok).toBe(false);
  });

  it("# at column 0 sets root.text (board name)", () => {
    const r = parseDSL("# マイボード\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes.root.text).toBe("マイボード");
  });

  it("## and ### are rejected", () => {
    const r1 = parseDSL("## sub\n", "b1");
    expect(r1.ok).toBe(false);
    const r2 = parseDSL("### sub\n", "b1");
    expect(r2.ok).toBe(false);
  });

  it("top-level task at column 0 is a child of root", () => {
    const r = parseDSL("- [ ] project\n  - [ ] child\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const project = findNode(r.nodes, "project");
    const child = findNode(r.nodes, "child");
    expect(project.parentId).toBe("root");
    expect(child.parentId).toBe(project.id);
  });

  it("checkbox - [ ] foo → inbox", () => {
    const r = parseDSL("- [ ] foo\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const foo = findNode(r.nodes, "foo");
    expect(foo.status).toBe("inbox");
  });

  it("status glyphs [-] [|] [x]", () => {
    const r = parseDSL("- [-] wip\n- [|] review\n- [x] done\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(findNode(r.nodes, "wip").status).toBe("wip");
    expect(findNode(r.nodes, "review").status).toBe("review");
    expect(findNode(r.nodes, "done").status).toBe("done");
    expect(findNode(r.nodes, "done").completed).toBe(true);
  });

  it("checkbox indented = child of nearest task at lower indent", () => {
    const r = parseDSL("- [ ] project\n  - [ ] a\n    - [ ] b\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const project = findNode(r.nodes, "project");
    const a = findNode(r.nodes, "a");
    const b = findNode(r.nodes, "b");
    expect(a.parentId).toBe(project.id);
    expect(b.parentId).toBe(a.id);
  });

  it("sibling tasks: child indent ends previous parent's scope", () => {
    const r = parseDSL("- [ ] A\n  - [ ] child\n- [ ] B\n  - [ ] other\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const a = findNode(r.nodes, "A");
    const b = findNode(r.nodes, "B");
    expect(findNode(r.nodes, "child").parentId).toBe(a.id);
    expect(findNode(r.nodes, "other").parentId).toBe(b.id);
  });

  it("checkbox nested under task", () => {
    const r = parseDSL("- [ ] parent\n  - [ ] child\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const parent = findNode(r.nodes, "parent");
    expect(findNode(r.nodes, "child").parentId).toBe(parent.id);
  });

  it("worklog: - text under task becomes WorkLogEntry with Date.now()", () => {
    const before = Date.now();
    const r = parseDSL("- [ ] task\n  - did something\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = findNode(r.nodes, "task");
    expect(task.workLogs).toHaveLength(1);
    expect(task.workLogs[0].text).toBe("did something");
    expect(task.workLogs[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it("worklog with timestamp: - YYYY-MM-DD HH:MM: text", () => {
    const r = parseDSL("- [ ] task\n  - 2026-06-25 14:30: did it\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = findNode(r.nodes, "task");
    const d = new Date(2026, 5, 25, 14, 30);
    expect(task.workLogs[0].timestamp).toBe(d.getTime());
    expect(task.workLogs[0].text).toBe("did it");
  });

  it("worklog without preceding task is rejected", () => {
    const r = parseDSL("- orphan log\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("作業履歴の前にタスク");
  });

  it("worklog at wrong depth is rejected", () => {
    const r = parseDSL("- [ ] task\n    - wrong depth\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("作業履歴のインデント");
  });

  it("multiple worklogs accumulate on the same task", () => {
    const r = parseDSL(
      "- [ ] task\n  - 2026-06-25 10:00: first\n  - 2026-06-25 11:00: second\n",
      "b1",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = findNode(r.nodes, "task");
    expect(task.workLogs).toHaveLength(2);
  });

  it("attributes inline: @priority:high @due:2026-12-31", () => {
    const r = parseDSL("- [ ] foo @priority:high @due:2026-12-31\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const foo = findNode(r.nodes, "foo");
    expect(foo.priority).toBe("high");
    expect(foo.dueDate).toBe("2026-12-31");
  });

  it("@estimate:8 sets estimate", () => {
    const r = parseDSL("- [ ] foo @estimate:8\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(findNode(r.nodes, "foo").estimate).toBe(8);
  });

  it("invalid checkbox glyph → error", () => {
    const r = parseDSL("- [?] foo\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("チェックボックス");
  });

  it("invalid timestamp → error", () => {
    const r = parseDSL("- [ ] task\n  - 2026-13-99 25:99: foo\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("タイムスタンプ");
  });

  it("tabs in indent → error", () => {
    const r = parseDSL("- [ ] a\n\t- [ ] b\n", "b1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("タブ");
  });

  it("odd indent (1 space) → error", () => {
    const r = parseDSL("- [ ] a\n - [ ] b\n", "b1");
    expect(r.ok).toBe(false);
  });

  it("unrecognized line → error", () => {
    const r = parseDSL("garbage line\n", "b1");
    expect(r.ok).toBe(false);
  });

  it("inline @attr in worklog body preserved as text", () => {
    const r = parseDSL("- [ ] task\n  - 2026-06-25 10:00: @priority:high note\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const task = findNode(r.nodes, "task");
    expect(task.workLogs[0].text).toBe("@priority:high note");
    expect(task.priority).toBe("medium");
  });
});

function rootNode(text = ""): MindNode {
  return {
    id: "root",
    boardId: "b1",
    text,
    parentId: null,
    isRoot: true,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    status: "inbox",
    children: ["a"],
    x: 0,
    y: 0,
    estimate: null,
    workLogs: [],
  };
}

describe("serializeDSL — indented-text DSL", () => {
  it("serializes root heading + child task", () => {
    const nodes: Record<string, MindNode> = {
      root: rootNode("Root"),
      a: {
        ...rootNode(),
        id: "a",
        parentId: "root",
        text: "Section",
        children: ["b"],
        status: "inbox",
      },
      b: {
        ...rootNode(),
        id: "b",
        parentId: "a",
        text: "Task",
        completed: true,
        status: "done",
        children: [],
      },
    };
    const out = serializeDSL(nodes);
    expect(out).toContain("- [ ] Section");
    expect(out).toContain("  - [x] Task");
  });

  it("serializes worklogs with timestamp", () => {
    const nodes: Record<string, MindNode> = {
      root: rootNode(),
      a: {
        ...rootNode(),
        id: "a",
        parentId: "root",
        text: "Task",
        children: [],
        workLogs: [
          {
            id: "wl1",
            timestamp: new Date(2026, 5, 25, 10, 0).getTime(),
            text: "Did X",
          },
        ],
      },
    };
    const out = serializeDSL(nodes);
    expect(out).toContain("  - 2026-06-25 10:00: Did X");
  });

  it("round-trip: simple board (all tasks)", () => {
    const src = "- [-] Project\n  - [-] Phase 1\n    - [ ] Task A\n    - [x] Task B\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const serialized = serializeDSL(r1.nodes);
    const r2 = parseDSL(serialized, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const project = findNode(r2.nodes, "Project");
    const phase = findNode(r2.nodes, "Phase 1");
    expect(project.parentId).toBe("root");
    expect(phase.parentId).toBe(project.id);
    expect(findNode(r2.nodes, "Task A").parentId).toBe(phase.id);
    expect(findNode(r2.nodes, "Task A").status).toBe("inbox");
    expect(findNode(r2.nodes, "Task B").parentId).toBe(phase.id);
    expect(findNode(r2.nodes, "Task B").status).toBe("done");
  });

  it("round-trip: worklogs preserved in order", () => {
    const src = "- [ ] Task\n  - 2026-06-25 10:00: First\n  - 2026-06-25 11:00: Second\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const serialized = serializeDSL(r1.nodes);
    const r2 = parseDSL(serialized, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const task = findNode(r2.nodes, "Task");
    expect(task.workLogs).toHaveLength(2);
    expect(task.workLogs[0].text).toBe("First");
    expect(task.workLogs[1].text).toBe("Second");
  });

  it("round-trip: attributes preserved", () => {
    const src = "- [ ] foo @priority:high @estimate:4 @due:2026-12-31\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const serialized = serializeDSL(r1.nodes);
    const r2 = parseDSL(serialized, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const foo = findNode(r2.nodes, "foo");
    expect(foo.priority).toBe("high");
    expect(foo.estimate).toBe(4);
    expect(foo.dueDate).toBe("2026-12-31");
  });

  it("round-trip: 4+ levels preserve all descendants (regression for serializer data loss)", () => {
    const src = "- [ ] A\n  - [ ] B\n    - [ ] C\n      - [ ] D\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const serialized = serializeDSL(r1.nodes);
    const r2 = parseDSL(serialized, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const b = findNode(r2.nodes, "B");
    const c = findNode(r2.nodes, "C");
    const d = findNode(r2.nodes, "D");
    expect(c.parentId).toBe(b.id);
    expect(d.parentId).toBe(c.id);
  });

  it("worklog attaches to the immediately preceding task", () => {
    const r = parseDSL("- [ ] A\n- [ ] B\n  - 2026-06-25 10:00: note\n", "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const a = findNode(r.nodes, "A");
    const b = findNode(r.nodes, "B");
    expect(a.workLogs).toHaveLength(0);
    expect(b.workLogs).toHaveLength(1);
    expect(b.workLogs[0].text).toBe("note");
  });

  it("round-trip: board name + tasks", () => {
    const src = "# マイボード\n- [ ] 着手\n- [x] 完了\n";
    const r1 = parseDSL(src, "b1");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const out = serializeDSL(r1.nodes);
    expect(out).toContain("# マイボード");
    expect(out).toContain("- [ ] 着手");
    expect(out).toContain("- [x] 完了");
    const r2 = parseDSL(out, "b1");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.nodes.root.text).toBe("マイボード");
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
