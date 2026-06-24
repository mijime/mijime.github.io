import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskCard } from "./TaskCard";
import { MindProvider, useMindStore } from "../hooks/use-mind-store";
import type { MindNode } from "../types";
import type { State } from "../store";

function makeNode(over: Partial<MindNode> = {}): MindNode {
  return {
    id: "n1",
    boardId: "b1",
    text: "牛乳",
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
    boards: [],
    currentBoardId: "b1",
    draggingNodeId: null,
    drawerOpen: false,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    viewMode: "mindmap",
    searchQuery: "",
    selectedNodeId: null,
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: { root: makeNode({ id: "root", isRoot: true }), n1: makeNode() },
    ...over,
  } as State;
}

let captured: State | null = null;
function Capture() {
  captured = useMindStore().state;
  return null;
}

describe("TaskCard", () => {
  it("renders text, add-child button, and status dot", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode({ status: "wip" })} />
      </MindProvider>,
    );
    expect(screen.getByText("牛乳")).toBeTruthy();
    expect(screen.getByTestId("add-child-n1")).toBeTruthy();
    expect(screen.getByTestId("status-dot-n1").className).toContain("bg-sky-500");
  });

  it("opens edit-new modal when add-child is clicked", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode()} />
      </MindProvider>,
    );
    fireEvent.click(screen.getByTestId("add-child-n1"));
    expect(captured!.modal).toEqual({ kind: "edit-new", parentId: "n1" });
  });

  it("toggles complete when checkbox is clicked", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode()} />
      </MindProvider>,
    );
    fireEvent.click(screen.getByTestId("task-check-n1"));
    expect(captured!.nodes.n1.completed).toBe(true);
  });

  it("renders categoryColor dot alongside status dot", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TaskCard node={makeNode({ categoryColor: "rose", status: "done" })} />
      </MindProvider>,
    );
    expect(screen.getByTestId("category-dot-n1").className).toContain("bg-rose-400");
    expect(screen.getByTestId("status-dot-n1").className).toContain("bg-emerald-500");
  });
});
