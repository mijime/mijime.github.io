import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KanbanBoard } from "./KanbanBoard";
import { MindProvider } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
import type { MindNode, TaskStatus } from "../types";

function node(
  opts: Partial<MindNode> & {
    id: string;
    boardId: string;
    parentId: string | null;
    status: TaskStatus;
  },
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
    status: opts.status,
    children: [],
    estimate: null,
    workLogs: [],
    x: 0,
    y: 0,
  };
}

function renderBoard(nodes: MindNode[]) {
  const s: State = {
    ...createInitialState(),
    currentBoardId: "b",
    boards: [{ id: "b", name: "B", createdAt: 0, updatedAt: 0 }],
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  };
  return render(
    <MindProvider initialState={s}>
      <KanbanBoard />
    </MindProvider>,
  );
}

describe("KanbanBoard", () => {
  it("renders all 4 status columns", () => {
    renderBoard([]);
    expect(screen.getByTestId("kanban-column-inbox")).toBeTruthy();
    expect(screen.getByTestId("kanban-column-wip")).toBeTruthy();
    expect(screen.getByTestId("kanban-column-review")).toBeTruthy();
    expect(screen.getByTestId("kanban-column-done")).toBeTruthy();
  });

  it("distributes nodes to their status columns (root is excluded)", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true, status: "inbox" });
    const wipNode = node({ id: "n1", boardId: "b", parentId: "root", status: "wip" });
    const doneNode = node({ id: "n2", boardId: "b", parentId: "root", status: "done" });
    renderBoard([root, wipNode, doneNode]);
    expect(screen.getByTestId("kanban-column-count-wip").textContent).toBe("1");
    expect(screen.getByTestId("kanban-column-count-done").textContent).toBe("1");
    expect(screen.getByTestId("kanban-column-count-inbox").textContent).toBe("0");
    expect(screen.getByTestId("kanban-column-count-review").textContent).toBe("0");
  });

  it("renders cards in DFS order matching children array order", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true, status: "inbox" });
    const b = node({ id: "b", boardId: "b", parentId: "root", status: "inbox" });
    const a = node({ id: "a", boardId: "b", parentId: "root", status: "inbox" });
    root.children = ["b", "a"];
    a.parentId = "root";
    b.parentId = "root";
    renderBoard([root, b, a]);
    const inboxCol = screen.getByTestId("kanban-column-inbox");
    const cards = inboxCol.querySelectorAll("[data-node-id]");
    const cardIds = [...cards].map((c) => (c as HTMLElement).dataset.nodeId);
    expect(cardIds.indexOf("b")).toBeLessThan(cardIds.indexOf("a"));
  });
});
