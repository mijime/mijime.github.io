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
      root: makeNode({ id: "root", isRoot: true, text: "Root", children: ["n1"] }),
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
  it("renders the serialized DSL on mount", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    expect(ta.value).toContain("mindmap");
    expect(ta.value).toContain("* Root");
    expect(ta.value).toContain("* Child");
  });

  it("shows preview when DSL is valid", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    expect(screen.getByTestId("text-editor-preview")).toBeTruthy();
    expect(screen.queryByTestId("text-editor-error")).toBeNull();
  });

  it("renders preview with depth-based indentation and status dot", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const preview = screen.getByTestId("text-editor-preview");
    const items = preview.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0].style.paddingLeft).toBe("0px");
    expect(items[1].style.paddingLeft).toBe("16px");
    expect(preview.textContent).toContain("Root");
    expect(preview.textContent).toContain("Child");
  });

  it("shows error when DSL is invalid", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "no header" } });
    });
    expect(screen.getByTestId("text-editor-error")).toBeTruthy();
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
        target: { value: "mindmap\n  * NewRoot\n    * NewChild\n" },
      });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("text-editor-apply"));
    });
    await waitFor(() => {
      expect(captured!.nodes.root.text).toBe("NewRoot");
    });
    expect(captured!.boards[0].name).toBe("NewRoot");
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
        target: { value: "mindmap\n  * Replaced\n" },
      });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("text-editor-apply"));
    });
    expect(captured!.nodes.root.text).toBe("Root");
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
    expect(ta.value).toContain("* Root");
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
      fireEvent.change(ta, { target: { value: "mindmap\n  * CmdRoot\n" } });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "Enter", metaKey: true });
    });
    await waitFor(() => {
      expect(captured!.nodes.root.text).toBe("CmdRoot");
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
      fireEvent.change(ta, { target: { value: "mindmap\n  * CtrlRoot\n" } });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    });
    await waitFor(() => {
      expect(captured!.nodes.root.text).toBe("CtrlRoot");
    });
  });
});
