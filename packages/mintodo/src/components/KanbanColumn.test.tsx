import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KanbanColumn } from "./KanbanColumn";
import { MindProvider } from "../hooks/use-mind-store";
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
    status: opts.status ?? "inbox",
    children: [],
    x: 0,
    y: 0,
  };
}

function renderColumn(status: TaskStatus, nodes: MindNode[]) {
  const s: State = {
    ...createInitialState(),
    currentBoardId: "b",
    boards: [{ id: "b", name: "B", createdAt: 0, updatedAt: 0 }],
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  };
  return render(
    <MindProvider initialState={s}>
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
    expect(screen.getByTestId("kanban-column-review")).toBeTruthy();
  });
});
