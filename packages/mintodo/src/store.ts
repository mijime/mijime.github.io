import type { MindNode, Modal, View } from "./types";

export interface State {
  draggingNodeId: string | null;
  hideCompleted: boolean;
  modal: Modal;
  nodes: Record<string, MindNode>;
  physicsEnabled: boolean;
  searchQuery: string;
  selectedNodeId: string;
  view: View;
}

export type Action =
  | { type: "ADD_CHILD"; newId: string; parentId: string }
  | { type: "DELETE_NODE"; id: string }
  | { type: "MOVE_NODE"; id: string; x: number; y: number }
  | { type: "OPEN_MODAL"; modal: Modal }
  | { type: "RESET" }
  | { type: "SELECT"; id: string }
  | { type: "SET_DRAGGING"; id: string | null }
  | { type: "SET_NODES"; nodes: Record<string, MindNode> }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_VIEW"; view: View }
  | { type: "TOGGLE_COLLAPSE"; id: string }
  | { type: "TOGGLE_COMPLETE"; id: string }
  | { type: "TOGGLE_HIDE_COMPLETED" }
  | { type: "TOGGLE_PHYSICS" }
  | { type: "UPDATE_NODE"; id: string; patch: Partial<MindNode> };

export function createInitialState(): State {
  return {
    draggingNodeId: null,
    hideCompleted: false,
    modal: null,
    nodes: createInitialNodes(),
    physicsEnabled: true,
    searchQuery: "",
    selectedNodeId: "root",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SELECT":
      return { ...state, selectedNodeId: action.id };
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "SET_SEARCH":
      return { ...state, searchQuery: action.query };
    case "TOGGLE_HIDE_COMPLETED":
      return { ...state, hideCompleted: !state.hideCompleted };
    case "TOGGLE_PHYSICS":
      return { ...state, physicsEnabled: !state.physicsEnabled };
    case "OPEN_MODAL":
      return { ...state, modal: action.modal };
    case "SET_NODES":
      return { ...state, nodes: action.nodes };
    case "RESET":
      return {
        ...createInitialState(),
        physicsEnabled: state.physicsEnabled,
      };
    case "SET_DRAGGING":
      return { ...state, draggingNodeId: action.id };
    case "ADD_CHILD": {
      const parent = state.nodes[action.parentId];
      if (!parent) return state;
      const newId = action.newId;
      const newNode: MindNode = {
        categoryColor: parent.categoryColor,
        children: [],
        collapsed: false,
        completed: false,
        dueDate: "",
        id: newId,
        isRoot: false,
        parentId: parent.id,
        priority: "medium",
        text: "新規タスク",
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        x: parent.x + (parent.x >= 0 ? 140 : -140),
        y: parent.y + (Math.random() - 0.5) * 50,
      };
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [newId]: newNode,
          [parent.id]: { ...parent, children: [...parent.children, newId] },
        },
        selectedNodeId: newId,
      };
    }
    case "UPDATE_NODE": {
      const node = state.nodes[action.id];
      if (!node) return state;
      return {
        ...state,
        nodes: { ...state.nodes, [action.id]: { ...node, ...action.patch } },
      };
    }
    case "TOGGLE_COMPLETE": {
      const target = state.nodes[action.id];
      if (!target) return state;
      const next = !target.completed;
      const updated = { ...state.nodes };
      const cascade = (id: string) => {
        const n = updated[id];
        if (!n) return;
        updated[id] = { ...n, completed: next };
        n.children.forEach(cascade);
      };
      cascade(action.id);
      return { ...state, nodes: updated };
    }
    case "TOGGLE_COLLAPSE": {
      const node = state.nodes[action.id];
      if (!node) return state;
      return {
        ...state,
        nodes: { ...state.nodes, [action.id]: { ...node, collapsed: !node.collapsed } },
      };
    }
    case "DELETE_NODE": {
      const node = state.nodes[action.id];
      if (!node || node.isRoot) return state;
      const updated = { ...state.nodes };
      const remove = (id: string) => {
        const n = updated[id];
        if (!n) return;
        n.children.forEach(remove);
        delete updated[id];
      };
      remove(action.id);
      const parent = updated[node.parentId!];
      const next = {
        ...state,
        nodes: {
          ...updated,
          ...(parent
            ? { [parent.id]: { ...parent, children: parent.children.filter((c) => c !== action.id) } }
            : {}),
        },
        selectedNodeId: state.selectedNodeId === action.id ? (node.parentId ?? "root") : state.selectedNodeId,
      };
      return next;
    }
    case "MOVE_NODE": {
      const node = state.nodes[action.id];
      if (!node) return state;
      return {
        ...state,
        nodes: { ...state.nodes, [action.id]: { ...node, vx: 0, vy: 0, x: action.x, y: action.y } },
      };
    }
    default:
      return state;
  }
}

function makeNode(
  id: string,
  text: string,
  opts: Partial<MindNode> & { x: number; y: number },
): MindNode {
  return {
    categoryColor: "slate",
    children: [],
    collapsed: false,
    completed: false,
    dueDate: "",
    parentId: null,
    priority: "medium",
    vx: 0,
    vy: 0,
    ...opts,
    id,
    isRoot: opts.isRoot ?? false,
    text,
  };
}

export function createInitialNodes(): Record<string, MindNode> {
  const root = makeNode("root", "メインプロジェクト", {
    categoryColor: "slate",
    children: ["node-1", "node-2", "node-3"],
    isRoot: true,
    priority: "medium",
    x: 0,
    y: 0,
  });

  const node1 = makeNode("node-1", "企画・設計", {
    categoryColor: "sky",
    children: ["node-1-1", "node-1-2"],
    parentId: "root",
    priority: "high",
    x: -250,
    y: -120,
  });

  const node11 = makeNode("node-1-1", "要件定義書作成", {
    categoryColor: "sky",
    completed: true,
    dueDate: "2026-06-25",
    parentId: "node-1",
    priority: "high",
    x: -450,
    y: -180,
  });

  const node12 = makeNode("node-1-2", "UIデザイン作成", {
    categoryColor: "sky",
    dueDate: "2026-07-01",
    parentId: "node-1",
    priority: "medium",
    x: -450,
    y: -70,
  });

  const node2 = makeNode("node-2", "実装フェーズ", {
    categoryColor: "emerald",
    children: ["node-2-1", "node-2-2"],
    parentId: "root",
    priority: "high",
    x: 250,
    y: -50,
  });

  const node21 = makeNode("node-2-1", "フロントエンド実装", {
    categoryColor: "emerald",
    parentId: "node-2",
    priority: "high",
    x: 480,
    y: -100,
  });

  const node22 = makeNode("node-2-2", "API連携", {
    categoryColor: "emerald",
    parentId: "node-2",
    priority: "medium",
    x: 480,
    y: 0,
  });

  const node3 = makeNode("node-3", "テスト & リリース", {
    categoryColor: "rose",
    parentId: "root",
    priority: "low",
    x: 0,
    y: 180,
  });

  return {
    "node-1": node1,
    "node-1-1": node11,
    "node-1-2": node12,
    "node-2": node2,
    "node-2-1": node21,
    "node-2-2": node22,
    "node-3": node3,
    root,
  };
}
