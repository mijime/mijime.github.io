import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toolbar } from "./Toolbar";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import { createInitialState, type State } from "../store";
import type { MindNode } from "../types";

function makeNode(id: string, over: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId: "b1",
    text: id,
    parentId: null,
    isRoot: id === "root",
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    status: "inbox",
    children: [],
    estimate: null,
    workLogs: [],
    x: 0,
    y: 0,
    ...over,
    startDate: over.startDate ?? "",
  };
}

describe("Toolbar header", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the board controls without an in-app title", () => {
    render(
      <MindProvider>
        <Toolbar />
      </MindProvider>,
    );
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("button", { name: "サイドバーを表示" })).toBeTruthy();
  });

  it("does not render a theme toggle button", () => {
    render(
      <MindProvider>
        <Toolbar />
      </MindProvider>,
    );
    expect(screen.queryByTitle("テーマ切り替え")).toBeNull();
  });
});

describe("Toolbar delete-completed button", () => {
  let captured: State | null = null;
  function Capture() {
    captured = useMindStore().state;
    return null;
  }

  function renderWithNodes(nodes: MindNode[]) {
    captured = null;
    const s: State = {
      ...createInitialState(),
      currentBoardId: "b1",
      nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    };
    return render(
      <MindProvider initialState={s}>
        <Capture />
        <Toolbar />
      </MindProvider>,
    );
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches DELETE_COMPLETED after confirming", () => {
    renderWithNodes([
      makeNode("root", { children: ["a"] }),
      makeNode("a", { parentId: "root", status: "done", completed: true }),
    ]);
    fireEvent.click(screen.getByTestId("toolbar-delete-completed"));
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(captured!.nodes.a).toBeUndefined();
    expect(captured!.nodes.root).toBeDefined();
  });

  it("does nothing when confirm is cancelled", () => {
    renderWithNodes([
      makeNode("root", { children: ["a"] }),
      makeNode("a", { parentId: "root", status: "done", completed: true }),
    ]);
    fireEvent.click(screen.getByTestId("toolbar-delete-completed"));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(captured!.nodes.a).toBeDefined();
  });
});
