import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GanttBoard } from "./GanttBoard";
import { MindProvider } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
import type { MindNode } from "../types";

function makeNode(id: string, parentId: string | null, opts: Partial<MindNode> = {}): MindNode {
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
    dueDate: opts.dueDate ?? "",
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

function makeState(over: Partial<State> = {}): State {
  return {
    boards: [{ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 }],
    currentBoardId: "b1",
    draggingNodeId: null,
    drawerOpen: false,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    viewMode: "gantt",
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: {
      root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a", "b"] }),
      a: makeNode("a", "root", { text: "Task A", estimate: 4 }),
      b: makeNode("b", "root", { text: "Task B", estimate: 4 }),
    },
    ...over,
  };
}

describe("GanttBoard", () => {
  it("renders one row per node (excluding root)", () => {
    render(
      <MindProvider initialState={makeState()}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.getByTestId("gantt-row-a")).toBeTruthy();
    expect(screen.getByTestId("gantt-row-b")).toBeTruthy();
    expect(screen.queryByTestId("gantt-row-root")).toBeNull();
  });

  it("does not crash with empty nodes", () => {
    render(
      <MindProvider initialState={{ ...createInitialState(), currentBoardId: null }}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.getByTestId("gantt-board")).toBeTruthy();
  });

  it("shows effectiveEstimate for non-leaf without explicit estimate", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a", "b"] }),
        a: makeNode("a", "root", { text: "A", children: ["c"] }),
        b: makeNode("b", "root", { text: "B", estimate: 4 }),
        c: makeNode("c", "a", { text: "C", estimate: 4 }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    // EffectiveEstimate("a") = effectiveEstimate("c") = 4 (no implicit overhead)
    expect(screen.getByTestId("gantt-row-a").textContent).toMatch(/4h/u);
  });

  it("shows explicit estimate for non-leaf with @estimate (not sched.estimateH)", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a", "b"] }),
        a: makeNode("a", "root", { text: "Phase 2", estimate: 20, children: ["c", "d"] }),
        b: makeNode("b", "root", { text: "B", estimate: 4 }),
        c: makeNode("c", "a", { text: "C", estimate: 4 }),
        d: makeNode("d", "a", { text: "D", estimate: 16 }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.getByTestId("gantt-row-a").textContent).toMatch(/20h/u);
  });

  it("shows overflow badge when non-leaf planned estimate < computed span", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a", "b"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, children: ["c"] }),
        b: makeNode("b", "root", { text: "B", estimate: 4 }),
        c: makeNode("c", "a", { text: "C", estimate: 8 }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    // A is non-leaf with plannedEstimate=4 but computed span = child C's 8h → overflow
    expect(screen.getByTestId("gantt-row-a").textContent).toMatch(/超過/u);
  });

  it("does NOT show overflow badge when non-leaf planned estimate >= computed span", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a", "b"] }),
        a: makeNode("a", "root", { text: "A", estimate: 10, children: ["c"] }),
        b: makeNode("b", "root", { text: "B", estimate: 4 }),
        c: makeNode("c", "a", { text: "C", estimate: 4 }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    // A is non-leaf with plannedEstimate=10, computed span = 4h → no overflow
    expect(screen.getByTestId("gantt-row-a").textContent).not.toMatch(/超過/u);
  });

  it("shows overdue badge for leaf with dueDate past computed end", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        // Due before epoch; schedule starts at epoch, so end (999h later) exceeds due
        a: makeNode("a", "root", { text: "A", estimate: 999, dueDate: "1969-12-01" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.getByTestId("gantt-row-a").textContent).toMatch(/超過/u);
  });

  it("shows date labels matching today when no @start", () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayLabel = `${now.getMonth() + 1}/${now.getDate()}`;
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 8 }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.getByText(todayLabel)).toBeTruthy();
  });

  it("shows tomorrow label for 16h estimate", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterLabel = `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}`;
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 16 }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    // 16h = 2 days, labels at day0 (today), day1, day2 (day after tomorrow)
    expect(screen.getByText(dayAfterLabel)).toBeTruthy();
  });

  it("uses @start date as origin when present", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 8, startDate: "2026-07-01" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.getByText("7/1")).toBeTruthy();
    expect(screen.getByText("7/2")).toBeTruthy();
  });
});

describe("GanttBoard bar colors", () => {
  it("leaf bar uses status color (wip → sky)", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, status: "wip" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    const bar = screen.getByTestId("gantt-bar-a-bar");
    expect(bar.style.background).toBe("rgb(14, 165, 233)");
  });

  it("leaf bar uses status color (done → emerald)", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, status: "done" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    const bar = screen.getByTestId("gantt-bar-a-bar");
    expect(bar.style.background).toBe("rgb(16, 185, 129)");
  });

  it("leaf bar uses status color (review → amber)", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, status: "review" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    const bar = screen.getByTestId("gantt-bar-a-bar");
    expect(bar.style.background).toBe("rgb(245, 158, 11)");
  });

  it("leaf bar uses status color (inbox → slate)", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, status: "inbox" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    const bar = screen.getByTestId("gantt-bar-a-bar");
    expect(bar.style.background).toBe("rgb(148, 163, 184)");
  });

  it("leaf bar has top/bottom border matching its status", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, status: "wip" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    const bar = screen.getByTestId("gantt-bar-a-bar");
    expect(bar.style.borderTop).toBe("2px solid rgb(14, 165, 233)");
    expect(bar.style.borderBottom).toBe("2px solid rgb(14, 165, 233)");
  });

  it("parent bar border matches own status (not child status)", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", status: "review", children: ["c", "d"] }),
        c: makeNode("c", "a", { text: "C", estimate: 4, status: "wip" }),
        d: makeNode("d", "a", { text: "D", estimate: 4, status: "done" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    const parentBar = screen.getByTestId("gantt-bar-a-bar");
    // Parent is "review" → amber border
    expect(parentBar.style.borderTop).toBe("2px solid rgb(245, 158, 11)");
    expect(parentBar.style.borderBottom).toBe("2px solid rgb(245, 158, 11)");
    // Child segments still show their own status colors
    const parentRow = screen.getByTestId("gantt-bar-a");
    const segC = parentRow.querySelector("[data-testid='gantt-bar-a-seg-c']") as HTMLElement;
    expect(segC.style.background).toBe("rgb(14, 165, 233)");
    const segD = parentRow.querySelector("[data-testid='gantt-bar-a-seg-d']") as HTMLElement;
    expect(segD.style.background).toBe("rgb(16, 185, 129)");
  });

  it("parent bar has segment for each direct child", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", children: ["c", "d"] }),
        c: makeNode("c", "a", { text: "C", estimate: 4, status: "wip" }),
        d: makeNode("d", "a", { text: "D", estimate: 4, status: "done" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    const parentBar = screen.getByTestId("gantt-bar-a");
    expect(parentBar.querySelector("[data-testid='gantt-bar-a-seg-c']")).toBeTruthy();
    expect(parentBar.querySelector("[data-testid='gantt-bar-a-seg-d']")).toBeTruthy();
  });

  it("segment color matches child status", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", children: ["c", "d"] }),
        c: makeNode("c", "a", { text: "C", estimate: 4, status: "wip" }),
        d: makeNode("d", "a", { text: "D", estimate: 4, status: "done" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    const parentBar = screen.getByTestId("gantt-bar-a");
    const segC = parentBar.querySelector("[data-testid='gantt-bar-a-seg-c']") as HTMLElement;
    expect(segC.style.background).toBe("rgb(14, 165, 233)");
    const segD = parentBar.querySelector("[data-testid='gantt-bar-a-seg-d']") as HTMLElement;
    expect(segD.style.background).toBe("rgb(16, 185, 129)");
  });

  it("segments have absolute positioning relative to parent bar", () => {
    const state = makeState({
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", children: ["c", "d"] }),
        c: makeNode("c", "a", { text: "C", estimate: 4, status: "wip" }),
        d: makeNode("d", "a", { text: "D", estimate: 4, status: "review" }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    // Two children with same estimate should have sequential non-overlapping positions
    const parentBar = screen.getByTestId("gantt-bar-a");
    const segC = parentBar.querySelector("[data-testid='gantt-bar-a-seg-c']") as HTMLElement;
    const segD = parentBar.querySelector("[data-testid='gantt-bar-a-seg-d']") as HTMLElement;
    expect(segC.style.position).toBe("absolute");
    expect(segD.style.position).toBe("absolute");
    // SegC is first, segD is second — segC should start at 0, segD starts at width of segC
    expect(Number.parseFloat(segC.style.left)).toBe(0);
    expect(Number.parseFloat(segD.style.left)).toBeGreaterThan(0);
  });
});

describe("GanttBoard hideCompleted", () => {
  it("hides completed leaf when hideCompleted=true", () => {
    const state = makeState({
      hideCompleted: true,
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a", "b"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, completed: true }),
        b: makeNode("b", "root", { text: "B", estimate: 4 }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.queryByTestId("gantt-row-a")).toBeNull();
    expect(screen.getByTestId("gantt-row-b")).toBeTruthy();
  });

  it("hides completed parent and its descendants", () => {
    const state = makeState({
      hideCompleted: true,
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a", "b"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, children: ["c"], completed: true }),
        b: makeNode("b", "root", { text: "B", estimate: 4 }),
        c: makeNode("c", "a", { text: "C", estimate: 4 }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.queryByTestId("gantt-row-a")).toBeNull();
    expect(screen.queryByTestId("gantt-row-c")).toBeNull();
    expect(screen.getByTestId("gantt-row-b")).toBeTruthy();
  });

  it("hides only completed leaf, shows parent and siblings", () => {
    const state = makeState({
      hideCompleted: true,
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, children: ["c", "d"] }),
        c: makeNode("c", "a", { text: "C", estimate: 4, completed: true }),
        d: makeNode("d", "a", { text: "D", estimate: 4 }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.queryByTestId("gantt-row-c")).toBeNull();
    expect(screen.getByTestId("gantt-row-a")).toBeTruthy();
    expect(screen.getByTestId("gantt-row-d")).toBeTruthy();
  });

  it("shows all nodes when hideCompleted=false (default)", () => {
    const state = makeState({
      hideCompleted: false,
      nodes: {
        root: makeNode("root", null, { isRoot: true, text: "Root", children: ["a"] }),
        a: makeNode("a", "root", { text: "A", estimate: 4, completed: true }),
      },
    });
    render(
      <MindProvider initialState={state}>
        <GanttBoard />
      </MindProvider>,
    );
    expect(screen.getByTestId("gantt-row-a")).toBeTruthy();
  });
});
