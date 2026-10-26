import { describe, expect, it } from "vitest";
import { formatBadges, categoryBorderColor, statusDotClass } from "./badges";
import type { MindNode } from "../types";

function makeNode(opts: Partial<MindNode> = {}): MindNode {
  return {
    id: "n",
    boardId: "b",
    text: "t",
    parentId: null,
    isRoot: false,
    completed: opts.completed ?? false,
    collapsed: false,
    priority: opts.priority ?? "medium",
    categoryColor: "slate",
    dueDate: opts.dueDate ?? "",
    status: opts.status ?? "inbox",
    children: [],
    estimate: null,
    workLogs: [],
    x: 0,
    y: 0,
    ...opts,
    startDate: opts.startDate ?? "",
  };
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("formatBadges", () => {
  it("empty dueDate -> kind none, showPriority false, statusLabel INBOX", () => {
    const r = formatBadges(makeNode());
    expect(r.due.kind).toBe("none");
    expect(r.due.daysFromNow).toBe(0);
    expect(r.showPriority).toBe(false);
    expect(r.statusLabel).toBe("INBOX");
  });

  it("past dueDate -> kind overdue, negative daysFromNow", () => {
    const r = formatBadges(makeNode({ dueDate: "2000-01-01" }));
    expect(r.due.kind).toBe("overdue");
    expect(r.due.daysFromNow).toBeLessThan(0);
  });

  it("due today -> kind today, daysFromNow 0", () => {
    const r = formatBadges(makeNode({ dueDate: todayString() }));
    expect(r.due.kind).toBe("today");
    expect(r.due.daysFromNow).toBe(0);
  });

  it("future dueDate -> kind future, positive daysFromNow", () => {
    const r = formatBadges(makeNode({ dueDate: "2099-12-31" }));
    expect(r.due.kind).toBe("future");
    expect(r.due.daysFromNow).toBeGreaterThan(0);
  });

  it("done status suppresses due to kind none", () => {
    const r = formatBadges(makeNode({ dueDate: "2000-01-01", status: "done", completed: true }));
    expect(r.due.kind).toBe("none");
  });

  it("done status but not completed also suppresses due", () => {
    const r = formatBadges(makeNode({ dueDate: "2000-01-01", status: "done", completed: false }));
    expect(r.due.kind).toBe("none");
  });

  it("showPriority is true only for high", () => {
    expect(formatBadges(makeNode({ priority: "low" })).showPriority).toBe(false);
    expect(formatBadges(makeNode({ priority: "medium" })).showPriority).toBe(false);
    expect(formatBadges(makeNode({ priority: "high" })).showPriority).toBe(true);
  });

  it("statusLabel maps each TaskStatus", () => {
    expect(formatBadges(makeNode({ status: "inbox" })).statusLabel).toBe("INBOX");
    expect(formatBadges(makeNode({ status: "wip" })).statusLabel).toBe("WIP");
    expect(formatBadges(makeNode({ status: "review" })).statusLabel).toBe("REVIEW");
    expect(formatBadges(makeNode({ status: "done" })).statusLabel).toBe("DONE");
  });
});

describe("categoryBorderColor", () => {
  it("maps colors to hex/var values", () => {
    expect(categoryBorderColor("sky")).toBe("var(--tone-sky)");
    expect(categoryBorderColor("emerald")).toBe("var(--tone-green)");
    expect(categoryBorderColor("rose")).toBe("var(--tone-rose)");
    expect(categoryBorderColor("slate")).toBe("var(--mid)");
  });
});

describe("statusDotClass", () => {
  it("returns the right class per status", () => {
    expect(statusDotClass("inbox")).toBe("bg-(--mid)");
    expect(statusDotClass("wip")).toBe("bg-(--info)");
    expect(statusDotClass("review")).toBe("bg-(--warning)");
    expect(statusDotClass("done")).toBe("bg-(--success)");
  });
});
