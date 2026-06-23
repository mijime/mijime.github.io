import { describe, expect, it } from "vitest";
import { formatBadges, categoryDotClass, categoryBorderColor } from "./badges";
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
    x: 0,
    y: 0,
    ...opts,
  };
}

describe("formatBadges", () => {
  it("empty dueDate -> no dueHtml, showBadgeRow only if high priority", () => {
    const r = formatBadges(makeNode());
    expect(r.dueHtml).toBe("");
    expect(r.showHigh).toBe(false);
    expect(r.showBadgeRow).toBe(false);
  });

  it("overdue dueDate -> rose 超過 badge", () => {
    const past = "2000-01-01";
    const r = formatBadges(makeNode({ dueDate: past }));
    expect(r.dueHtml).toContain("超過");
    expect(r.showBadgeRow).toBe(true);
  });

  it("due today -> amber 今日 badge", () => {
    const today = new Date();
    const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const r = formatBadges(makeNode({ dueDate: ds }));
    expect(r.dueHtml).toContain("今日");
    expect(r.showBadgeRow).toBe(true);
  });

  it("future dueDate -> あと N 日 badge", () => {
    const r = formatBadges(makeNode({ dueDate: "2099-12-31" }));
    expect(r.dueHtml).toContain("あと");
    expect(r.showBadgeRow).toBe(true);
  });

  it("done status suppresses dueHtml", () => {
    const r = formatBadges(makeNode({ dueDate: "2000-01-01", status: "done", completed: true }));
    expect(r.dueHtml).toBe("");
  });

  it("high priority -> showHigh true", () => {
    const r = formatBadges(makeNode({ priority: "high" }));
    expect(r.showHigh).toBe(true);
    expect(r.showBadgeRow).toBe(true);
  });

  it("done with status but not completed suppresses dueHtml", () => {
    const r = formatBadges(makeNode({ dueDate: "2000-01-01", status: "done", completed: false }));
    expect(r.dueHtml).toBe("");
  });
});

describe("categoryDotClass", () => {
  it("maps colors to tailwind classes", () => {
    expect(categoryDotClass("sky")).toBe("bg-sky-400");
    expect(categoryDotClass("emerald")).toBe("bg-emerald-400");
    expect(categoryDotClass("rose")).toBe("bg-rose-400");
    expect(categoryDotClass("slate")).toBe("bg-slate-400");
  });
});

describe("categoryBorderColor", () => {
  it("maps colors to hex/var values", () => {
    expect(categoryBorderColor("sky")).toBe("#0ea5e9");
    expect(categoryBorderColor("emerald")).toBe("#10b981");
    expect(categoryBorderColor("rose")).toBe("#f43f5e");
    expect(categoryBorderColor("slate")).toBe("var(--mid)");
  });
});
