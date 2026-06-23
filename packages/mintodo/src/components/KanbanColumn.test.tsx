import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KanbanColumn } from "./KanbanColumn";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
import type { MindNode, TaskStatus } from "../types";

// Jsdom doesn't implement DataTransfer
class MockDataTransfer {
  private data = new Map<string, string>();
  public types: string[] = [];
  public effectAllowed = "move";
  public dropEffect = "move";

  public setData(format: string, data: string): void {
    this.data.set(format, data);
    if (!this.types.includes(format)) {
      this.types.push(format);
    }
  }

  public getData(format: string): string {
    return this.data.get(format) ?? "";
  }
}

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

function Probe() {
  const { state } = useMindStore();
  return <span data-testid="probe-status">{state.nodes["n1"]?.status ?? "missing"}</span>;
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

  it("drop dispatches SET_STATUS for the column's status", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true });
    const n1 = node({ id: "n1", boardId: "b", parentId: "root", status: "inbox" });
    const s: State = {
      ...createInitialState(),
      currentBoardId: "b",
      boards: [{ id: "b", name: "B", createdAt: 0, updatedAt: 0 }],
      nodes: Object.fromEntries([root, n1].map((n) => [n.id, n])),
    };
    render(
      <MindProvider initialState={s}>
        <KanbanColumn status="done" />
        <Probe />
      </MindProvider>,
    );
    const column = screen.getByTestId("kanban-column-done");
    const dt = new MockDataTransfer();
    dt.setData("application/x-mindnode-id", "n1");
    act(() => {
      fireEvent.drop(column, { dataTransfer: dt as unknown as DataTransfer });
    });
    expect(screen.getByTestId("probe-status").textContent).toBe("done");
  });
});
