import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDragNode } from "./use-drag-node";
import { MindProvider, useMindStore } from "./use-mind-store";
import type { State } from "../store";
import type { MindNode } from "../types";

function makeNode(id: string, parentId: string | null, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId: "b1",
    text: id,
    parentId,
    isRoot: parentId === null,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    children: opts.children ?? [],
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    ...opts,
  };
}

function makeState(): State {
  return {
    boards: [],
    currentBoardId: "b1",
    draggingNodeId: null,
    drawerOpen: false,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    searchQuery: "",
    selectedNodeId: "a",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: {
      root: makeNode("root", null, { isRoot: true, children: ["a", "b"] }),
      a: makeNode("a", "root", { x: 0, y: -220, children: ["a1"] }),
      a1: makeNode("a1", "a", { x: 0, y: -440 }),
      b: makeNode("b", "root", { x: 220, y: 0 }),
    },
  };
}

let lastState: State | null = null;

function Capture() {
  lastState = useMindStore().state;
  return null;
}

function Probe() {
  useDragNode();
  return null;
}

function setup() {
  lastState = null;
  // Jsdom does not implement elementFromPoint; provide a mock that returns null by default
  document.elementFromPoint ??= vi.fn().mockReturnValue(null);
  document.body.innerHTML = `
    <div id="node-dom-root" data-node-id="root" style="left: 0px; top: 0px; width: 100px; height: 60px;"></div>
    <div id="node-dom-a" data-node-id="a" style="left: 0px; top: -220px; width: 100px; height: 60px;"></div>
    <div id="node-dom-a1" data-node-id="a1" style="left: 0px; top: -440px; width: 100px; height: 60px;"></div>
    <div id="node-dom-b" data-node-id="b" style="left: 220px; top: 0px; width: 100px; height: 60px;"></div>
  `;
  return render(
    <MindProvider initialState={makeState()}>
      <Capture />
      <Probe />
    </MindProvider>,
  );
}

function dragFromTo(fromX: number, fromY: number, toX: number, toY: number) {
  act(() => {
    fireEvent.mouseDown(document.querySelector("#node-dom-a")!, { clientX: fromX, clientY: fromY });
    fireEvent.mouseMove(window, { clientX: toX, clientY: toY });
    fireEvent.mouseUp(window, { clientX: toX, clientY: toY });
  });
}

describe("useDragNode", () => {
  beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("does not change parent on click without drag movement", () => {
    setup();
    dragFromTo(50, -190, 50, -190);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("root");
    expect(lastState!.draggingNodeId).toBeNull();
  });

  it("dispatches SNAP_BACK when dropped on empty space", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(null);
    dragFromTo(50, -190, 300, 200);
    expect(lastState).not.toBeNull();
    expect(lastState!.draggingNodeId).toBeNull();
    expect(lastState!.layoutVersion).toBeGreaterThan(0);
  });

  it("dispatches REPARENT when dropped on a non-descendant node", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(document.querySelector("#node-dom-b"));
    dragFromTo(50, -190, 270, 30);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("b");
    expect(lastState!.nodes.b.children).toContain("a");
  });

  it("dispatches SNAP_BACK when dropped on a descendant", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(document.querySelector("#node-dom-a1"));
    dragFromTo(50, -190, 50, -410);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("root");
  });

  it("dispatches SNAP_BACK when dropped on itself", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(document.querySelector("#node-dom-a"));
    dragFromTo(50, -190, 60, -200);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("root");
  });

  it("dispatches SNAP_BACK when dropped on the root", () => {
    setup();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(
      document.querySelector("#node-dom-root"),
    );
    dragFromTo(50, -190, 50, 30);
    expect(lastState).not.toBeNull();
    expect(lastState!.nodes.a.parentId).toBe("root");
  });
});
