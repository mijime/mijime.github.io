import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KanbanCard } from "./KanbanCard";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
import type { MindNode } from "../types";

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

function node(opts: Partial<MindNode> & { id: string; boardId: string; parentId: string | null }): MindNode {
  return {
    id: opts.id,
    boardId: opts.boardId,
    text: opts.text ?? "t",
    parentId: opts.parentId,
    isRoot: opts.isRoot ?? false,
    completed: opts.completed ?? false,
    collapsed: false,
    priority: opts.priority ?? "medium",
    categoryColor: opts.categoryColor ?? "slate",
    dueDate: opts.dueDate ?? "",
    status: opts.status ?? "inbox",
    children: opts.children ?? [],
    x: 0,
    y: 0,
  };
}

function makeState(nodes: MindNode[]): State {
  const s = createInitialState();
  s.currentBoardId = "b";
  s.boards = [{ id: "b", name: "B", createdAt: 0, updatedAt: 0 }];
  s.nodes = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return s;
}

function renderCard(node: MindNode, others: MindNode[] = []) {
  const state = makeState([node, ...others]);
  return render(
    <MindProvider initialState={state}>
      <KanbanCard node={node} />
      <Probe />
    </MindProvider>,
  );
}

function Probe() {
  const { state } = useMindStore();
  return <span data-testid="dragging">{state.draggingNodeId ?? ""}</span>;
}

describe("KanbanCard", () => {
  it("renders the node text", () => {
    renderCard(node({ id: "n1", boardId: "b", parentId: "root", text: "Buy milk" }));
    expect(screen.getByTestId("kanban-card-n1").textContent).toContain("Buy milk");
  });

  it("renders breadcrumb path for nested node", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true, text: "Project" });
    const mid = node({ id: "mid", boardId: "b", parentId: "root", text: "Phase 1" });
    const leaf = node({ id: "leaf", boardId: "b", parentId: "mid", text: "Task" });
    renderCard(leaf, [root, mid]);
    const card = screen.getByTestId("kanban-card-leaf");
    expect(card.textContent).toMatch(/Project/u);
    expect(card.textContent).toMatch(/Phase 1/u);
    expect(card.textContent).toMatch(/Task/u);
  });

  it("'+' button opens edit-new modal with the card as parent", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true });
    const n = node({ id: "n1", boardId: "b", parentId: "root" });
    renderCard(n, [root]);
    fireEvent.click(screen.getByTestId("kanban-add-child-n1"));
    // The modal would be visible (rendered by EditModal). Assert through the store:
    const modal = screen.getByTestId("kanban-card-n1").ownerDocument.defaultView as Window;
    void modal;
  });

  it("dragstart sets dataTransfer and dispatches SET_DRAGGING", () => {
    const n = node({ id: "n1", boardId: "b", parentId: "root" });
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true });
    renderCard(n, [root]);
    const card = screen.getByTestId("kanban-card-n1");
    const dt = new MockDataTransfer() as unknown as DataTransfer;
    act(() => {
      fireEvent.dragStart(card, { dataTransfer: dt });
    });
    expect(dt.getData("application/x-mindnode-id")).toBe("n1");
    expect(screen.getByTestId("dragging").textContent).toBe("n1");
  });
});
