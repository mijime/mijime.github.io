import { describe, expect, it } from "vitest";
import { createInitialState, isDescendant, reducer } from "./store";
import type { Board, MindNode } from "./types";

function makeNode(id: string, boardId: string, opts: Partial<MindNode> = {}): MindNode {
  return {
    id,
    boardId,
    text: opts.text ?? "node",
    parentId: opts.parentId ?? null,
    isRoot: opts.isRoot ?? false,
    completed: false,
    collapsed: false,
    priority: "medium",
    categoryColor: "slate",
    dueDate: "",
    status: "inbox",
    children: [],
    x: 0,
    y: 0,
    ...opts,
  };
}

const boardA: Board = { id: "b-a", name: "A", createdAt: 1, updatedAt: 1 };
const boardB: Board = { id: "b-b", name: "B", createdAt: 2, updatedAt: 2 };

describe("createInitialState", () => {
  it("starts with no boards, no current board, no nodes, and sidebar open", () => {
    const s = createInitialState();
    expect(s.boards).toEqual([]);
    expect(s.currentBoardId).toBeNull();
    expect(s.nodes).toEqual({});
    expect(s.drawerOpen).toBe(true);
  });
});

describe("isDescendant", () => {
  it("returns true when nodeId is a descendant of candidateAncestor", () => {
    const nodes = {
      root: makeNode("root", "b-a", { isRoot: true, children: ["a", "a1"] }),
      a: makeNode("a", "b-a", { parentId: "root", children: ["a1"] }),
      a1: makeNode("a1", "b-a", { parentId: "a" }),
    };
    expect(isDescendant(nodes, "root", "a1")).toBe(true);
  });

  it("returns false when nodeId is not a descendant", () => {
    const nodes = {
      root: makeNode("root", "b-a", { isRoot: true, children: ["a", "b"] }),
      a: makeNode("a", "b-a", { parentId: "root" }),
      b: makeNode("b", "b-a", { parentId: "root" }),
    };
    expect(isDescendant(nodes, "a", "b")).toBe(false);
  });

  it("returns false when candidateAncestor is the node itself", () => {
    const nodes = {
      root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
      a: makeNode("a", "b-a", { parentId: "root" }),
    };
    expect(isDescendant(nodes, "a", "a")).toBe(false);
  });
});

describe("reducer - SET_BOARDS", () => {
  it("replaces boards list", () => {
    const s = createInitialState();
    const next = reducer(s, { boards: [boardA, boardB], type: "SET_BOARDS" });
    expect(next.boards).toEqual([boardA, boardB]);
  });
});

describe("reducer - SET_CURRENT_BOARD", () => {
  it("sets currentBoardId", () => {
    const s = createInitialState();
    const next = reducer(s, { boardId: "b-a", type: "SET_CURRENT_BOARD" });
    expect(next.currentBoardId).toBe("b-a");
  });

  it("can be set to null", () => {
    const s = { ...createInitialState(), currentBoardId: "b-a" };
    const next = reducer(s, { boardId: null, type: "SET_CURRENT_BOARD" });
    expect(next.currentBoardId).toBeNull();
  });
});

describe("reducer - ADD_BOARD", () => {
  it("adds a board and its initial nodes; sets currentBoardId; resets view", () => {
    const s = createInitialState();
    const next = reducer(s, {
      board: boardA,
      initialNodes: { root: makeNode("root", boardA.id, { isRoot: true }) },
      type: "ADD_BOARD",
    });
    expect(next.boards).toEqual([boardA]);
    expect(next.currentBoardId).toBe("b-a");
    expect(next.nodes.root).toBeDefined();
    expect(next.nodes.root.boardId).toBe("b-a");
    expect(next.view).toEqual({ pan: { x: 0, y: 0 }, zoom: 1 });
  });

  it("resets view even when previous view was non-default", () => {
    const s = {
      ...createInitialState(),
      boards: [boardA],
      currentBoardId: "b-a",
      view: { pan: { x: 500, y: 300 }, zoom: 0.5 },
    };
    const next = reducer(s, {
      board: boardB,
      initialNodes: { root: makeNode("root", boardB.id, { isRoot: true }) },
      type: "ADD_BOARD",
    });
    expect(next.view).toEqual({ pan: { x: 0, y: 0 }, zoom: 1 });
  });

  it("appends to existing boards list", () => {
    const s = { ...createInitialState(), boards: [boardA], currentBoardId: "b-a" };
    const next = reducer(s, {
      board: boardB,
      initialNodes: { root: makeNode("root", boardB.id, { isRoot: true }) },
      type: "ADD_BOARD",
    });
    expect(next.boards).toEqual([boardA, boardB]);
  });
});

describe("reducer - RENAME_BOARD", () => {
  it("updates name and updatedAt", () => {
    const s = { ...createInitialState(), boards: [boardA] };
    const next = reducer(s, { id: "b-a", name: "Renamed", type: "RENAME_BOARD" });
    expect(next.boards[0].name).toBe("Renamed");
    expect(next.boards[0].updatedAt).toBeGreaterThanOrEqual(boardA.updatedAt);
  });
});

describe("reducer - DELETE_BOARD", () => {
  it("removes board and its nodes; switches to nextBoardId", () => {
    const s = {
      ...createInitialState(),
      boards: [boardA, boardB],
      currentBoardId: "b-a",
      nodes: {
        "root-a": makeNode("root-a", "b-a", { isRoot: true }),
        "root-b": makeNode("root-b", "b-b", { isRoot: true }),
      },
    };
    const next = reducer(s, { id: "b-a", nextBoardId: "b-b", type: "DELETE_BOARD" });
    expect(next.boards).toEqual([boardB]);
    expect(next.currentBoardId).toBe("b-b");
    expect(next.nodes["root-a"]).toBeUndefined();
    expect(next.nodes["root-b"]).toBeDefined();
  });

  it("sets currentBoardId to null when no nextBoardId", () => {
    const s = {
      ...createInitialState(),
      boards: [boardA],
      currentBoardId: "b-a",
      nodes: { root: makeNode("root", "b-a", { isRoot: true }) },
    };
    const next = reducer(s, { id: "b-a", nextBoardId: null, type: "DELETE_BOARD" });
    expect(next.boards).toEqual([]);
    expect(next.currentBoardId).toBeNull();
    expect(next.nodes).toEqual({});
  });
});

describe("reducer - RESET", () => {
  it("keeps only root node for current board", () => {
    const s = {
      ...createInitialState(),
      boards: [boardA],
      currentBoardId: "b-a",
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, text: "My Board" }),
        "n-1": makeNode("n-1", "b-a", { parentId: "root", text: "child" }),
        "n-2": makeNode("n-2", "b-a", { parentId: "n-1", text: "grandchild" }),
      },
    };
    const next = reducer(s, { type: "RESET" });
    expect(Object.keys(next.nodes)).toEqual(["root"]);
    expect(next.nodes.root.boardId).toBe("b-a");
    expect(next.nodes.root.parentId).toBeNull();
    expect(next.nodes.root.children).toEqual([]);
    expect(next.view).toEqual({ pan: { x: 0, y: 0 }, zoom: 1 });
  });

  it("resets view on reset", () => {
    const s = {
      ...createInitialState(),
      boards: [boardA],
      currentBoardId: "b-a",
      view: { pan: { x: 500, y: 300 }, zoom: 0.5 },
    };
    const next = reducer(s, { type: "RESET" });
    expect(next.view).toEqual({ pan: { x: 0, y: 0 }, zoom: 1 });
  });

  it("bumps layoutVersion", () => {
    const s = {
      ...createInitialState(),
      boards: [boardA],
      currentBoardId: "b-a",
      nodes: { root: makeNode("root", "b-a", { isRoot: true }) },
    };
    const next = reducer(s, { type: "RESET" });
    expect(next.layoutVersion).toBe(s.layoutVersion + 1);
  });
});

describe("reducer - SELECT", () => {
  it("updates selectedNodeId", () => {
    const s = createInitialState();
    const next = reducer(s, { id: "n-1", type: "SELECT" });
    expect(next.selectedNodeId).toBe("n-1");
  });
});

describe("reducer - SET_VIEW", () => {
  it("updates view", () => {
    const s = createInitialState();
    const next = reducer(s, {
      type: "SET_VIEW",
      view: { pan: { x: 100, y: 50 }, zoom: 1.5 },
    });
    expect(next.view).toEqual({ pan: { x: 100, y: 50 }, zoom: 1.5 });
  });
});

describe("reducer - SET_SEARCH", () => {
  it("updates searchQuery", () => {
    const s = createInitialState();
    const next = reducer(s, { query: "hoge", type: "SET_SEARCH" });
    expect(next.searchQuery).toBe("hoge");
  });
});

describe("reducer - TOGGLE_HIDE_COMPLETED", () => {
  it("toggles hideCompleted", () => {
    const s = createInitialState();
    const next = reducer(s, { type: "TOGGLE_HIDE_COMPLETED" });
    expect(next.hideCompleted).toBe(true);
    const next2 = reducer(next, { type: "TOGGLE_HIDE_COMPLETED" });
    expect(next2.hideCompleted).toBe(false);
  });
});

describe("reducer - OPEN_MODAL", () => {
  it("opens edit modal", () => {
    const s = createInitialState();
    const next = reducer(s, {
      modal: { kind: "edit", nodeId: "n-1" },
      type: "OPEN_MODAL",
    });
    expect(next.modal).toEqual({ kind: "edit", nodeId: "n-1" });
  });

  it("opens board-name modal for create", () => {
    const s = createInitialState();
    const next = reducer(s, {
      modal: { kind: "board-name", mode: "create" },
      type: "OPEN_MODAL",
    });
    expect(next.modal).toEqual({ kind: "board-name", mode: "create" });
  });

  it("opens board-delete modal", () => {
    const s = createInitialState();
    const next = reducer(s, {
      modal: { kind: "board-delete", boardId: "b-a", boardName: "A" },
      type: "OPEN_MODAL",
    });
    expect(next.modal).toEqual({ kind: "board-delete", boardId: "b-a", boardName: "A" });
  });

  it("closes modal when null", () => {
    const s = createInitialState();
    const next = reducer(s, { modal: null, type: "OPEN_MODAL" });
    expect(next.modal).toBeNull();
  });
});

describe("reducer - ADD_CHILD", () => {
  it("creates new child, places it on the radial layout, selects it, bumps layoutVersion", () => {
    const s = {
      ...createInitialState(),
      boards: [boardA],
      currentBoardId: "b-a",
      nodes: { root: makeNode("root", "b-a", { isRoot: true, children: [] }) },
    };
    const before = s.layoutVersion;
    const next = reducer(s, {
      newId: "n-new",
      parentId: "root",
      type: "ADD_CHILD",
    });
    expect(next.selectedNodeId).toBe("n-new");
    expect(next.nodes["n-new"].parentId).toBe("root");
    expect(next.nodes["n-new"].boardId).toBe("b-a");
    expect(next.nodes["n-new"].isRoot).toBe(false);
    expect(next.nodes.root.children).toContain("n-new");
    expect(next.nodes["n-new"].x).toBeCloseTo(0);
    expect(next.nodes["n-new"].y).toBe(-240);
    expect(next.layoutVersion).toBe(before + 1);
  });
});

describe("reducer - UPDATE_NODE", () => {
  it("patches node fields", () => {
    const s = {
      ...createInitialState(),
      nodes: { n: makeNode("n", "b-a", { text: "old", priority: "low" }) },
    };
    const next = reducer(s, { id: "n", patch: { text: "new" }, type: "UPDATE_NODE" });
    expect(next.nodes.n.text).toBe("new");
    expect(next.nodes.n.priority).toBe("low");
  });
});

describe("reducer - TOGGLE_COLLAPSE", () => {
  it("flips collapsed flag", () => {
    const s = {
      ...createInitialState(),
      nodes: { n: makeNode("n", "b-a") },
    };
    const next = reducer(s, { id: "n", type: "TOGGLE_COLLAPSE" });
    expect(next.nodes.n.collapsed).toBe(true);
  });
});

describe("reducer - DELETE_NODE", () => {
  it("removes node and descendants; updates parent children", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root", children: ["b"] }),
        b: makeNode("b", "b-a", { parentId: "a" }),
      },
    };
    const next = reducer(s, { id: "a", type: "DELETE_NODE" });
    expect(next.nodes.a).toBeUndefined();
    expect(next.nodes.b).toBeUndefined();
    expect(next.nodes.root.children).not.toContain("a");
  });
});

describe("reducer - REPARENT", () => {
  it("moves a node to a new parent's children list and re-layouts", () => {
    const s = {
      ...createInitialState(),
      layoutVersion: 0,
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a", "b"] }),
        a: makeNode("a", "b-a", { parentId: "root" }),
        b: makeNode("b", "b-a", { parentId: "root" }),
      },
    };
    const next = reducer(s, { id: "b", newParentId: "a", type: "REPARENT" });
    expect(next.nodes.b.parentId).toBe("a");
    expect(next.nodes.a.children).toContain("b");
    expect(next.nodes.root.children).not.toContain("b");
    expect(next.layoutVersion).toBe(1);
  });

  it("rejects reparenting a node onto itself", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root" }),
      },
    };
    const next = reducer(s, { id: "a", newParentId: "a", type: "REPARENT" });
    expect(next.nodes.a.parentId).toBe("root");
  });

  it("rejects reparenting a node onto its descendant", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root", children: ["a1"] }),
        a1: makeNode("a1", "b-a", { parentId: "a" }),
      },
    };
    const next = reducer(s, { id: "a", newParentId: "a1", type: "REPARENT" });
    expect(next.nodes.a.parentId).toBe("root");
  });

  it("rejects reparenting the root", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root" }),
      },
    };
    const next = reducer(s, { id: "root", newParentId: "a", type: "REPARENT" });
    expect(next.nodes.root.parentId).toBeNull();
  });
});

describe("reducer - CREATE_CHILD", () => {
  it("creates a new child node with the given text and attributes", () => {
    const s = {
      ...createInitialState(),
      currentBoardId: "b-a",
      nodes: { root: makeNode("root", "b-a", { isRoot: true, children: [] }) },
    };
    const next = reducer(s, {
      type: "CREATE_CHILD",
      newId: "n1",
      parentId: "root",
      text: "my task",
      priority: "high",
      categoryColor: "sky",
      dueDate: "2026-07-01",
      completed: false,
      status: "inbox",
    });
    expect(next.nodes.n1.text).toBe("my task");
    expect(next.nodes.n1.priority).toBe("high");
    expect(next.nodes.n1.categoryColor).toBe("sky");
    expect(next.nodes.n1.dueDate).toBe("2026-07-01");
    expect(next.nodes.n1.completed).toBe(false);
    expect(next.nodes.n1.isRoot).toBe(false);
    expect(next.nodes.n1.parentId).toBe("root");
  });

  it("appends the new node id to the parent's children list", () => {
    const s = {
      ...createInitialState(),
      currentBoardId: "b-a",
      nodes: { root: makeNode("root", "b-a", { isRoot: true, children: [] }) },
    };
    const next = reducer(s, {
      type: "CREATE_CHILD",
      newId: "n1",
      parentId: "root",
      text: "task",
      priority: "medium",
      categoryColor: "slate",
      dueDate: "",
      completed: false,
      status: "inbox",
    });
    expect(next.nodes.root.children).toContain("n1");
  });

  it("sets selectedNodeId to the new node id", () => {
    const s = {
      ...createInitialState(),
      currentBoardId: "b-a",
      nodes: { root: makeNode("root", "b-a", { isRoot: true, children: [] }) },
    };
    const next = reducer(s, {
      type: "CREATE_CHILD",
      newId: "n1",
      parentId: "root",
      text: "task",
      priority: "medium",
      categoryColor: "slate",
      dueDate: "",
      completed: false,
      status: "inbox",
    });
    expect(next.selectedNodeId).toBe("n1");
  });

  it("computes positions via the radial layout", () => {
    const s = {
      ...createInitialState(),
      currentBoardId: "b-a",
      layoutVersion: 0,
      nodes: { root: makeNode("root", "b-a", { isRoot: true, children: [] }) },
    };
    const before = s.layoutVersion;
    const next = reducer(s, {
      type: "CREATE_CHILD",
      newId: "n1",
      parentId: "root",
      text: "task",
      priority: "medium",
      categoryColor: "slate",
      dueDate: "",
      completed: false,
      status: "inbox",
    });
    expect(next.layoutVersion).toBe(before + 1);
    expect(next.nodes.n1.x).toBeCloseTo(0);
    expect(next.nodes.n1.y).toBe(-240);
  });
});

describe("reducer - SET_STATUS", () => {
  it("inbox -> wip: keeps completed=false, no cascade", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        a: makeNode("a", "b-a", { status: "inbox", children: ["b"] }),
        b: makeNode("b", "b-a", { parentId: "a", status: "inbox" }),
      },
    };
    const next = reducer(s, { id: "a", status: "wip", type: "SET_STATUS" });
    expect(next.nodes.a.status).toBe("wip");
    expect(next.nodes.a.completed).toBe(false);
    expect(next.nodes.b.status).toBe("inbox");
  });

  it("wip -> done: completed=true, cascades to descendants", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        a: makeNode("a", "b-a", { status: "wip", children: ["b"] }),
        b: makeNode("b", "b-a", { parentId: "a", status: "wip", children: ["c"] }),
        c: makeNode("c", "b-a", { parentId: "b", status: "inbox" }),
      },
    };
    const next = reducer(s, { id: "a", status: "done", type: "SET_STATUS" });
    expect(next.nodes.a.status).toBe("done");
    expect(next.nodes.a.completed).toBe(true);
    expect(next.nodes.b.status).toBe("done");
    expect(next.nodes.b.completed).toBe(true);
    expect(next.nodes.c.status).toBe("done");
    expect(next.nodes.c.completed).toBe(true);
  });

  it("done -> wip: completed=false, no cascade", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        a: makeNode("a", "b-a", { status: "done", completed: true, children: ["b"] }),
        b: makeNode("b", "b-a", { parentId: "a", status: "done", completed: true }),
      },
    };
    const next = reducer(s, { id: "a", status: "wip", type: "SET_STATUS" });
    expect(next.nodes.a.status).toBe("wip");
    expect(next.nodes.a.completed).toBe(false);
    expect(next.nodes.b.status).toBe("done");
    expect(next.nodes.b.completed).toBe(true);
  });

  it("nonexistent id: state unchanged", () => {
    const s = createInitialState();
    const next = reducer(s, { id: "missing", status: "done", type: "SET_STATUS" });
    expect(next).toBe(s);
  });
});

describe("reducer - SET_VIEW_MODE", () => {
  it("switches viewMode", () => {
    const s = createInitialState();
    const next = reducer(s, { type: "SET_VIEW_MODE", viewMode: "kanban" });
    expect(next.viewMode).toBe("kanban");
  });

  it("initial state defaults to mindmap", () => {
    expect(createInitialState().viewMode).toBe("mindmap");
  });
});

describe("reducer - TOGGLE_COMPLETE", () => {
  it("advances inbox -> wip", () => {
    const s = {
      ...createInitialState(),
      nodes: { n: makeNode("n", "b-a", { status: "inbox" }) },
    };
    const next = reducer(s, { id: "n", type: "TOGGLE_COMPLETE" });
    expect(next.nodes.n.status).toBe("wip");
    expect(next.nodes.n.completed).toBe(false);
  });

  it("advances wip -> review", () => {
    const s = {
      ...createInitialState(),
      nodes: { n: makeNode("n", "b-a", { status: "wip" }) },
    };
    const next = reducer(s, { id: "n", type: "TOGGLE_COMPLETE" });
    expect(next.nodes.n.status).toBe("review");
    expect(next.nodes.n.completed).toBe(false);
  });

  it("advances review -> done", () => {
    const s = {
      ...createInitialState(),
      nodes: { n: makeNode("n", "b-a", { status: "review" }) },
    };
    const next = reducer(s, { id: "n", type: "TOGGLE_COMPLETE" });
    expect(next.nodes.n.status).toBe("done");
    expect(next.nodes.n.completed).toBe(true);
  });

  it("resets done -> inbox", () => {
    const s = {
      ...createInitialState(),
      nodes: { n: makeNode("n", "b-a", { status: "done", completed: true }) },
    };
    const next = reducer(s, { id: "n", type: "TOGGLE_COMPLETE" });
    expect(next.nodes.n.status).toBe("inbox");
    expect(next.nodes.n.completed).toBe(false);
  });

  it("cascades to descendants when advancing to done", () => {
    const s = {
      ...createInitialState(),
      nodes: {
        a: makeNode("a", "b-a", { status: "review", children: ["b"] }),
        b: makeNode("b", "b-a", { parentId: "a" }),
      },
    };
    const next = reducer(s, { id: "a", type: "TOGGLE_COMPLETE" });
    expect(next.nodes.a.status).toBe("done");
    expect(next.nodes.a.completed).toBe(true);
    expect(next.nodes.b.status).toBe("done");
    expect(next.nodes.b.completed).toBe(true);
  });
});

describe("reducer - SNAP_BACK", () => {
  it("bumps layoutVersion and re-runs the layout without changing structure", () => {
    const s = {
      ...createInitialState(),
      layoutVersion: 5,
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root", x: 999, y: 999 }),
      },
    };
    const next = reducer(s, { id: "a", type: "SNAP_BACK" });
    expect(next.layoutVersion).toBe(6);
    expect(next.nodes.a.x).toBeCloseTo(0);
    expect(next.nodes.a.y).toBe(-240);
  });
});

describe("reducer - DELETE_COMPLETED", () => {
  it("removes completed non-root nodes and cascades into subtrees", () => {
    const s = {
      ...createInitialState(),
      currentBoardId: "b-a",
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["p"] }),
        p: makeNode("p", "b-a", {
          parentId: "root",
          status: "done",
          completed: true,
          children: ["c", "d"],
        }),
        c: makeNode("c", "b-a", { parentId: "p", status: "done", completed: true }),
        d: makeNode("d", "b-a", { parentId: "p", status: "inbox", completed: false }),
      },
    };
    const next = reducer(s, { type: "DELETE_COMPLETED" });
    expect(Object.keys(next.nodes).toSorted()).toEqual(["root"].toSorted());
    expect(next.nodes.p).toBeUndefined();
    expect(next.nodes.c).toBeUndefined();
    expect(next.nodes.d).toBeUndefined();
    expect(next.nodes.root.children).toEqual([]);
  });

  it("never deletes the root (defensive)", () => {
    const s = {
      ...createInitialState(),
      currentBoardId: "b-a",
      nodes: { root: makeNode("root", "b-a", { isRoot: true, status: "done", completed: true }) },
    };
    const next = reducer(s, { type: "DELETE_COMPLETED" });
    expect(next.nodes.root).toBeDefined();
  });

  it("resets selectedNodeId to root when the selected node is deleted", () => {
    const s = {
      ...createInitialState(),
      currentBoardId: "b-a",
      selectedNodeId: "p",
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["p"] }),
        p: makeNode("p", "b-a", { parentId: "root", status: "done", completed: true }),
      },
    };
    const next = reducer(s, { type: "DELETE_COMPLETED" });
    expect(next.selectedNodeId).toBe("root");
  });

  it("is a no-op when there is no current board", () => {
    const s = { ...createInitialState(), currentBoardId: null };
    const next = reducer(s, { type: "DELETE_COMPLETED" });
    expect(next).toBe(s);
  });

  it("is a no-op when no completed nodes exist", () => {
    const s = {
      ...createInitialState(),
      currentBoardId: "b-a",
      nodes: {
        root: makeNode("root", "b-a", { isRoot: true, children: ["a"] }),
        a: makeNode("a", "b-a", { parentId: "root", status: "inbox", completed: false }),
      },
    };
    const next = reducer(s, { type: "DELETE_COMPLETED" });
    expect(next).toBe(s);
  });
});
