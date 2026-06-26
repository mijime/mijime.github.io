import "fake-indexeddb/auto";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
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
    estimate: null,
    workLogs: [],
    ...over,
    startDate: over.startDate ?? "",
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

describe("TextEditor auto-save", () => {
  beforeEach(async () => {
    await db.open();
    await db.boards.clear();
    await db.nodes.clear();
    await db.meta.clear();
    await db.boards.put({ id: "b1", name: "Root", createdAt: 0, updatedAt: 0 });
  });
  afterEach(async () => {
    await db.delete();
  });

  it("renders initial serialized DSL (new format, no 'mindmap')", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    expect(ta.value).not.toContain("mindmap");
    expect(ta.value).toContain("# Root");
    expect(ta.value).toContain("- [ ] Child");
  });

  it("renders save-state indicator", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    expect(screen.getByTestId("text-editor-save-state")).toBeTruthy();
  });

  it("does NOT render apply button", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    expect(screen.queryByTestId("text-editor-apply")).toBeNull();
  });

  it("typing → after 1000ms SET_NODES dispatched", async () => {
    vi.useFakeTimers();
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "# Root\n- [ ] Changed\n" } });
    });
    const beforeNode = Object.values(captured!.nodes).find((n) => n.text === "Child");
    expect(beforeNode).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    const afterNode = Object.values(captured!.nodes).find((n) => n.text === "Changed");
    expect(afterNode).toBeTruthy();
    expect(afterNode!.parentId).toBe("root");
    vi.useRealTimers();
  });

  it("invalid line → '未保存' with error tooltip", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TextEditor />
      </MindProvider>,
    );
    act(() => {
      fireEvent.change(screen.getByTestId("text-editor-textarea"), {
        target: { value: "garbage line\n" },
      });
    });
    const pill = screen.getByTestId("text-editor-save-state");
    expect(pill.textContent).toContain("未保存");
    expect(pill.getAttribute("title")).toBeTruthy();
  });

  it("fixing invalid → after debounce '保存済み'", async () => {
    vi.useFakeTimers();
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "garbage\n" } });
    });
    act(() => {
      fireEvent.change(ta, { target: { value: "# Root\n- [ ] Fixed\n" } });
    });
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByTestId("text-editor-save-state").textContent).toContain("保存済み");
    vi.useRealTimers();
  });

  it("リセット reverts textarea to serialized DSL", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TextEditor />
      </MindProvider>,
    );
    const ta = screen.getByTestId("text-editor-textarea") as HTMLTextAreaElement;
    const initial = ta.value;
    act(() => {
      fireEvent.change(ta, { target: { value: "garbage" } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("text-editor-reset"));
    });
    expect(ta.value).toBe(initial);
  });
});
