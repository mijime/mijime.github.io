import { describe, expect, it } from "bun:test";
import { createInitialNodes, createInitialState, reducer } from "./store";

describe("createInitialNodes", () => {
  it("includes root node", () => {
    const nodes = createInitialNodes();
    expect(nodes.root).toBeDefined();
    expect(nodes.root.isRoot).toBe(true);
    expect(nodes.root.parentId).toBeNull();
    expect(nodes.root.children.length).toBeGreaterThan(0);
  });

  it("all non-root nodes have valid parentId", () => {
    const nodes = createInitialNodes();
    for (const [id, node] of Object.entries(nodes)) {
      if (node.isRoot) continue;
      expect(node.parentId).toBeTruthy();
      expect(nodes[node.parentId!]).toBeDefined();
    }
  });

  it("all children references are valid", () => {
    const nodes = createInitialNodes();
    for (const node of Object.values(nodes)) {
      for (const childId of node.children) {
        expect(nodes[childId]).toBeDefined();
      }
    }
  });

  it("root children are valid", () => {
    const nodes = createInitialNodes();
    for (const childId of nodes.root.children) {
      expect(nodes[childId].parentId).toBe("root");
    }
  });
});

describe("reducer - initial state", () => {
  it("creates initial state with default values", () => {
    const state = createInitialState();
    expect(state.selectedNodeId).toBe("root");
    expect(state.physicsEnabled).toBe(true);
    expect(state.hideCompleted).toBe(false);
    expect(state.searchQuery).toBe("");
    expect(state.draggingNodeId).toBeNull();
    expect(state.modal).toBeNull();
    expect(state.view.zoom).toBe(1);
  });
});

describe("reducer - SELECT", () => {
  it("updates selectedNodeId", () => {
    const state = createInitialState();
    const next = reducer(state, { id: "node-1", type: "SELECT" });
    expect(next.selectedNodeId).toBe("node-1");
  });
});

describe("reducer - SET_VIEW", () => {
  it("updates view", () => {
    const state = createInitialState();
    const next = reducer(state, {
      type: "SET_VIEW",
      view: { pan: { x: 100, y: 50 }, zoom: 1.5 },
    });
    expect(next.view).toEqual({ pan: { x: 100, y: 50 }, zoom: 1.5 });
  });
});

describe("reducer - SET_SEARCH", () => {
  it("updates searchQuery", () => {
    const state = createInitialState();
    const next = reducer(state, { query: "hoge", type: "SET_SEARCH" });
    expect(next.searchQuery).toBe("hoge");
  });
});

describe("reducer - TOGGLE_HIDE_COMPLETED", () => {
  it("toggles hideCompleted", () => {
    const state = createInitialState();
    const next = reducer(state, { type: "TOGGLE_HIDE_COMPLETED" });
    expect(next.hideCompleted).toBe(true);
    const next2 = reducer(next, { type: "TOGGLE_HIDE_COMPLETED" });
    expect(next2.hideCompleted).toBe(false);
  });
});

describe("reducer - TOGGLE_PHYSICS", () => {
  it("toggles physicsEnabled", () => {
    const state = createInitialState();
    const next = reducer(state, { type: "TOGGLE_PHYSICS" });
    expect(next.physicsEnabled).toBe(false);
  });
});

describe("reducer - OPEN_MODAL", () => {
  it("opens edit modal", () => {
    const state = createInitialState();
    const next = reducer(state, {
      modal: { kind: "edit", nodeId: "node-1" },
      type: "OPEN_MODAL",
    });
    expect(next.modal).toEqual({ kind: "edit", nodeId: "node-1" });
  });

  it("opens help modal", () => {
    const state = createInitialState();
    const next = reducer(state, { modal: { kind: "help" }, type: "OPEN_MODAL" });
    expect(next.modal).toEqual({ kind: "help" });
  });

  it("closes modal when null", () => {
    const state = createInitialState();
    const next = reducer(state, { modal: null, type: "OPEN_MODAL" });
    expect(next.modal).toBeNull();
  });
});
