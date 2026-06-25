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
    x: 0,
    y: 0,
    ...over,
  };
}

describe("Toolbar header", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the 'mintodo' wordmark in the h1", () => {
    render(
      <MindProvider>
        <Toolbar />
      </MindProvider>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("mintodo");
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
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithNodes([
      makeNode("root", { children: ["a"] }),
      makeNode("a", { parentId: "root", status: "done", completed: true }),
    ]);
    fireEvent.click(screen.getByTestId("toolbar-delete-completed"));
    expect(captured!.nodes.a).toBeUndefined();
    expect(captured!.nodes.root).toBeDefined();
  });

  it("does nothing when confirm is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithNodes([
      makeNode("root", { children: ["a"] }),
      makeNode("a", { parentId: "root", status: "done", completed: true }),
    ]);
    fireEvent.click(screen.getByTestId("toolbar-delete-completed"));
    expect(captured!.nodes.a).toBeDefined();
  });
});
