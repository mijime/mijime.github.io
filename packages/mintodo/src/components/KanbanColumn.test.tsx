import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KanbanColumn } from "./KanbanColumn";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
import type { MindNode, TaskStatus } from "../types";

function node(
  opts: Partial<MindNode> & { id: string; boardId: string; parentId: string | null },
): MindNode {
  return {
    id: opts.id,
    boardId: opts.boardId,
    text: opts.text ?? "t",
    parentId: opts.parentId,
    isRoot: opts.isRoot ?? false,
    completed: opts.completed ?? false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    startDate: "",
    status: opts.status ?? "inbox",
    children: opts.children ?? [],
    estimate: null,
    workLogs: [],
    x: 0,
    y: 0,
  };
}

let capturedState: State | null = null;

function Capture() {
  capturedState = useMindStore().state;
  return null;
}

function renderColumn(status: TaskStatus, nodes: MindNode[]) {
  capturedState = null;
  const s: State = {
    ...createInitialState(),
    currentBoardId: "b",
    boards: [{ id: "b", name: "B", createdAt: 0, updatedAt: 0 }],
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  };
  return render(
    <MindProvider initialState={s}>
      <Capture />
      <KanbanColumn status={status} />
    </MindProvider>,
  );
}

describe("KanbanColumn", () => {
  it("renders the status label and count", () => {
    renderColumn("wip", [node({ id: "root", boardId: "b", parentId: null, isRoot: true })]);
    expect(screen.getByText("作業中")).toBeTruthy();
    expect(screen.getByTestId("kanban-column-count-wip").textContent).toBe("0");
  });

  it("renders only nodes with matching status", () => {
    renderColumn("wip", [
      node({ id: "root", boardId: "b", parentId: null, isRoot: true }),
      node({ id: "n1", boardId: "b", parentId: "root", status: "wip" }),
      node({ id: "n2", boardId: "b", parentId: "root", status: "inbox" }),
    ]);
    expect(screen.getByTestId("kanban-card-n1")).toBeTruthy();
    expect(screen.queryByTestId("kanban-card-n2")).toBeNull();
    expect(screen.getByTestId("kanban-column-count-wip").textContent).toBe("1");
  });

  it("'追加' button dispatches edit-new modal with parentStatusSeed", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true });
    renderColumn("review", [root]);
    fireEvent.click(screen.getByTestId("kanban-column-add-review"));
    expect(capturedState!.modal).toEqual({
      kind: "edit-new",
      parentId: "root",
      parentStatusSeed: "review",
    });
  });

  it("excludes the root even when its status matches the column", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true, status: "inbox" });
    renderColumn("inbox", [root]);
    expect(screen.queryByTestId("kanban-card-root")).toBeNull();
    expect(screen.getByTestId("kanban-column-count-inbox").textContent).toBe("0");
  });

  it("hides a parent that has a non-completed leaf descendant (leaves only)", () => {
    const root = node({
      id: "root",
      boardId: "b",
      parentId: null,
      isRoot: true,
      status: "inbox",
      children: ["p"],
    });
    const p = node({
      id: "p",
      boardId: "b",
      parentId: "root",
      status: "wip",
      completed: false,
      children: ["a", "b"],
    });
    const a = node({ id: "a", boardId: "b", parentId: "p", status: "done", completed: true });
    const b = node({ id: "b", boardId: "b", parentId: "p", status: "wip", completed: false });
    renderColumn("wip", [root, p, a, b]);
    expect(screen.queryByTestId("kanban-card-p")).toBeNull();
    expect(screen.getByTestId("kanban-card-b")).toBeTruthy();
    expect(screen.getByTestId("kanban-column-count-wip").textContent).toBe("1");
  });

  it("shows both parent and leaves when every leaf descendant is completed", () => {
    const root = node({
      id: "root",
      boardId: "b",
      parentId: null,
      isRoot: true,
      status: "inbox",
      children: ["p"],
    });
    const p = node({
      id: "p",
      boardId: "b",
      parentId: "root",
      status: "done",
      completed: true,
      children: ["a", "b"],
    });
    const a = node({ id: "a", boardId: "b", parentId: "p", status: "done", completed: true });
    const b = node({ id: "b", boardId: "b", parentId: "p", status: "done", completed: true });
    renderColumn("done", [root, p, a, b]);
    expect(screen.getByTestId("kanban-card-p")).toBeTruthy();
    expect(screen.getByTestId("kanban-card-a")).toBeTruthy();
    expect(screen.getByTestId("kanban-card-b")).toBeTruthy();
    expect(screen.getByTestId("kanban-column-count-done").textContent).toBe("3");
  });
});
