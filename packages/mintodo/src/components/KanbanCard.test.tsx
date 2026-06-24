import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KanbanCard } from "./KanbanCard";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
import type { MindNode } from "../types";

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
    </MindProvider>,
  );
}

let captured: State | null = null;
function Capture() {
  captured = useMindStore().state;
  return null;
}

describe("KanbanCard multi-line text", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders multi-line text with whitespace-pre-wrap and max-w-[240px]", () => {
    const multiline = "first line\nsecond line wraps to a longer one";
    const n = node({
      id: "n1",
      boardId: "b",
      parentId: "root",
      text: multiline,
    });
    const root = node({
      id: "root",
      boardId: "b",
      parentId: null,
      isRoot: true,
    });
    renderCard(n, [root]);
    const card = screen.getByTestId("kanban-card-n1");
    const textSpan = card.querySelector("span.whitespace-pre-wrap") as HTMLElement;
    expect(textSpan).toBeTruthy();
    expect(textSpan.className).toContain("whitespace-pre-wrap");
    expect(textSpan.className).toContain("break-words");
    expect(textSpan.className).toContain("max-w-[240px]");
    expect(textSpan.className).not.toContain("truncate");
    expect(textSpan.textContent).toBe(multiline);
  });
});

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

  it("'+' button (inside TaskCard) opens edit-new modal with the card as parent", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true });
    const n = node({ id: "n1", boardId: "b", parentId: "root" });
    render(
      <MindProvider initialState={makeState([root, n])}>
        <Capture />
        <KanbanCard node={n} />
      </MindProvider>,
    );
    fireEvent.click(screen.getByTestId("add-child-n1"));
    expect(captured!.modal).toEqual({ kind: "edit-new", parentId: "n1" });
  });

  it("has dnd-kit draggable attributes", () => {
    const n = node({ id: "n1", boardId: "b", parentId: "root" });
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true });
    renderCard(n, [root]);
    const card = screen.getByTestId("kanban-card-n1");
    expect(card.getAttribute("role")).toBe("button");
  });

  it("clicking the card body opens the edit modal", () => {
    const root = node({ id: "root", boardId: "b", parentId: null, isRoot: true });
    const n1 = node({ id: "n1", boardId: "b", parentId: "root" });
    const state = makeState([root, n1]);
    render(
      <MindProvider initialState={state}>
        <Capture />
        <KanbanCard node={state.nodes.n1} />
      </MindProvider>,
    );
    fireEvent.click(screen.getByTestId("kanban-card-n1"));
    expect(captured!.modal).toEqual({ kind: "edit", nodeId: "n1" });
  });
});
