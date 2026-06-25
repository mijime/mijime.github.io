import "fake-indexeddb/auto";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { db } from "../db";
import { TextEditor } from "./TextEditor";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import type { MindNode } from "../types";
import type { State } from "../store";

function makeNode(over: Partial<MindNode> = {}): MindNode {
  return {
    id: "n1",
    boardId: "b1",
    text: "Child",
    parentId: "root",
    isRoot: false,
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
    viewMode: "text",
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: {
      root: makeNode({ id: "root", isRoot: true, text: "", children: ["n1"] }),
      n1: makeNode(),
    },
    ...over,
  };
}

let captured: State | null = null;
function Capture() {
  captured = useMindStore().state;
  return null;
}

describe("TextEditor", () => {
  it("renders the serialized DSL on mount (new Markdown format)", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    expect(ta.value).toContain("- [ ] Child");
  });

  it("does not show preview pane (removed)", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    expect(screen.queryByTestId("text-editor-preview")).toBeNull();
    expect(screen.queryByTestId("text-editor-error")).toBeNull();
  });

  it("applies parsed DSL on apply click and confirms", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await db.boards.put({ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 });
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, {
        target: { value: "# NewRoot\n  - [ ] NewChild\n" },
      });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("text-editor-apply"));
    });
    await waitFor(() => {
      const newRoot = Object.values(captured!.nodes).find((n) => n.text === "NewRoot");
      expect(newRoot).toBeTruthy();
    });
  });

  it("does not apply when confirm is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, {
        target: { value: "# Replaced\n" },
      });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("text-editor-apply"));
    });
    const root = Object.values(captured!.nodes).find((n) => n.text === "Child");
    expect(root).toBeTruthy();
  });

  it("resets textarea to current DSL on reset click", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "garbage" } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("text-editor-reset"));
    });
    expect(ta.value).toContain("- [ ] Child");
  });

  it("applies on Cmd+Enter (metaKey)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "# CmdRoot\n" } });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "Enter", metaKey: true });
    });
    await waitFor(() => {
      const root = Object.values(captured!.nodes).find((n) => n.text === "CmdRoot");
      expect(root).toBeTruthy();
    });
  });

  it("applies on Ctrl+Enter (ctrlKey)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "# CtrlRoot\n" } });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    });
    await waitFor(() => {
      const root = Object.values(captured!.nodes).find((n) => n.text === "CtrlRoot");
      expect(root).toBeTruthy();
    });
  });
});
