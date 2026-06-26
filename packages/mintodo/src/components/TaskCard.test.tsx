import { act, fireEvent, render, screen } from "@testing-library/react";
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
    estimate: null,
    workLogs: [],
    x: 0,
    y: 0,
    ...over,
    startDate: over.startDate ?? "",
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
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: { root: makeNode({ id: "root", isRoot: true }), n1: makeNode() },
    ...over,
  };
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
    expect(screen.getByTestId("task-status-n1").className).toContain("bg-sky-500");
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

  it("clicking the status dot advances status inbox -> wip", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode()} />
      </MindProvider>,
    );
    vi.useFakeTimers();
    fireEvent.click(screen.getByTestId("task-status-n1"));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(captured!.nodes.n1.status).toBe("wip");
    expect(captured!.nodes.n1.completed).toBe(false);
    vi.useRealTimers();
  });

  it("clicking the status dot from done resets to inbox", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode({ status: "done", completed: true })} />
      </MindProvider>,
    );
    vi.useFakeTimers();
    fireEvent.click(screen.getByTestId("task-status-n1"));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(captured!.nodes.n1.status).toBe("inbox");
    expect(captured!.nodes.n1.completed).toBe(false);
    vi.useRealTimers();
  });

  it("double clicking the status dot goes back one status", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode({ status: "wip" })} />
      </MindProvider>,
    );
    fireEvent.dblClick(screen.getByTestId("task-status-n1"));
    expect(captured!.nodes.n1.status).toBe("inbox");
  });

  it("double clicking the status dot from review goes to wip", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode({ status: "review" })} />
      </MindProvider>,
    );
    fireEvent.dblClick(screen.getByTestId("task-status-n1"));
    expect(captured!.nodes.n1.status).toBe("wip");
  });

  it("double clicking the status dot from done goes to review", () => {
    render(
      <MindProvider initialState={makeState()}>
        <Capture />
        <TaskCard node={makeNode({ status: "done", completed: true })} />
      </MindProvider>,
    );
    fireEvent.dblClick(screen.getByTestId("task-status-n1"));
    expect(captured!.nodes.n1.status).toBe("review");
    expect(captured!.nodes.n1.completed).toBe(false);
  });

  it("places the hairline between meta and body in the not-done case", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TaskCard node={makeNode({ status: "wip", categoryColor: "sky" })} />
      </MindProvider>,
    );
    const card = screen.getByTestId("task-card-n1");
    // [MetaRow, Hairline, BodyRow] — children[1] is the hairline
    const hairline = card.children[1] as HTMLElement;
    expect(hairline.style.borderTop).toBe("1px solid rgb(14, 165, 233)");
    expect(hairline.style.opacity).toBe("");
  });

  it("shows child progress M/N when the node has children", () => {
    const child1 = makeNode({ id: "c1", parentId: "n1", completed: true });
    const child2 = makeNode({ id: "c2", parentId: "n1", completed: false });
    const state = makeState({
      nodes: {
        root: makeNode({ id: "root", isRoot: true }),
        n1: makeNode({ status: "wip", children: ["c1", "c2"] }),
        c1: child1,
        c2: child2,
      },
    });
    render(
      <MindProvider initialState={state}>
        <TaskCard node={state.nodes.n1!} />
      </MindProvider>,
    );
    expect(screen.getByTestId("task-card-progress-n1").textContent).toBe("1 / 2");
  });

  it("hides the progress row when the node is a leaf", () => {
    render(
      <MindProvider initialState={makeState()}>
        <TaskCard node={makeNode()} />
      </MindProvider>,
    );
    expect(screen.queryByTestId("task-card-progress-n1")).toBeNull();
  });

  it("hides the progress row when the node is done", () => {
    const child = makeNode({ id: "c1", parentId: "n1", completed: true });
    const state = makeState({
      nodes: {
        root: makeNode({ id: "root", isRoot: true }),
        n1: makeNode({ status: "done", completed: true, children: ["c1"] }),
        c1: child,
      },
    });
    render(
      <MindProvider initialState={state}>
        <TaskCard node={state.nodes.n1!} />
      </MindProvider>,
    );
    expect(screen.queryByTestId("task-card-progress-n1")).toBeNull();
  });

  it("uses categoryColor for the hairline and renders status dot when done", () => {
    const { container } = render(
      <MindProvider initialState={makeState()}>
        <TaskCard node={makeNode({ categoryColor: "rose", status: "done", completed: true })} />
      </MindProvider>,
    );
    const card = screen.getByTestId("task-card-n1");
    // Done: DOM is [BodyRow, Hairline]; hairline is at index 1
    const hairline = card.children[1] as HTMLElement;
    expect(hairline.style.borderTop).toBe("1px solid rgb(244, 63, 94)");
    expect(hairline.style.opacity).toBe("0.35");
    // Meta row status dot is absent
    expect(screen.queryByTestId("status-dot-button-n1")).toBeNull();
    // The body uses Crimson Pro for the title
    const title = container.querySelector("span.whitespace-pre-wrap") as HTMLElement;
    expect(title.style.fontFamily).toContain("Crimson Pro");
  });
});
