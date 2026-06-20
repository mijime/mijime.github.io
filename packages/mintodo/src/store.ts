import type { Board, MindNode, Modal, View } from "./types";

export interface State {
  boards: Board[];
  currentBoardId: string | null;
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
  | { type: "ADD_BOARD"; board: Board; initialNodes: Record<string, MindNode> }
  | { type: "ADD_CHILD"; newId: string; parentId: string }
  | { type: "DELETE_BOARD"; id: string; nextBoardId: string | null }
  | { type: "DELETE_NODE"; id: string }
  | { type: "MOVE_NODE"; id: string; x: number; y: number }
  | { type: "OPEN_MODAL"; modal: Modal }
  | { type: "RENAME_BOARD"; id: string; name: string }
  | { type: "RESET" }
  | { type: "SELECT"; id: string }
  | { type: "SET_BOARDS"; boards: Board[] }
  | { type: "SET_CURRENT_BOARD"; boardId: string | null }
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
    boards: [],
    currentBoardId: null,
    draggingNodeId: null,
    hideCompleted: false,
    modal: null,
    nodes: {},
    physicsEnabled: true,
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_BOARDS": {
      return { ...state, boards: action.boards };
    }
    case "SET_CURRENT_BOARD": {
      return { ...state, currentBoardId: action.boardId };
    }
    case "ADD_BOARD": {
      const existing = state.boards.find((b) => b.id === action.board.id);
      if (existing) return state;
      return {
        ...state,
        boards: [...state.boards, action.board],
        currentBoardId: action.board.id,
        nodes: action.initialNodes,
        selectedNodeId: "root",
      };
    }
    case "RENAME_BOARD": {
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.id ? { ...b, name: action.name, updatedAt: Date.now() } : b,
        ),
      };
    }
    case "DELETE_BOARD": {
      const remaining = state.boards.filter((b) => b.id !== action.id);
      const filteredNodes: Record<string, MindNode> = {};
      for (const [id, n] of Object.entries(state.nodes)) {
        if (n.boardId !== action.id) filteredNodes[id] = n;
      }
      return {
        ...state,
        boards: remaining,
        currentBoardId:
          state.currentBoardId === action.id ? action.nextBoardId : state.currentBoardId,
        nodes:
          state.currentBoardId === action.id
            ? action.nextBoardId
              ? filteredNodes
              : {}
            : state.nodes,
      };
    }
    case "RESET": {
      if (!state.currentBoardId) return state;
      const board = state.boards.find((b) => b.id === state.currentBoardId);
      const root: MindNode = {
        id: "root",
        boardId: state.currentBoardId,
        text: board?.name ?? "メインプロジェクト",
        parentId: null,
        isRoot: true,
        completed: false,
        collapsed: false,
        priority: "medium",
        categoryColor: "slate",
        dueDate: "",
        children: [],
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      };
      return {
        ...state,
        nodes: { root },
        selectedNodeId: "root",
        physicsEnabled: state.physicsEnabled,
      };
    }
    case "SELECT": {
      return { ...state, selectedNodeId: action.id };
    }
    case "SET_VIEW": {
      return { ...state, view: action.view };
    }
    case "SET_SEARCH": {
      return { ...state, searchQuery: action.query };
    }
    case "TOGGLE_HIDE_COMPLETED": {
      return { ...state, hideCompleted: !state.hideCompleted };
    }
    case "TOGGLE_PHYSICS": {
      return { ...state, physicsEnabled: !state.physicsEnabled };
    }
    case "OPEN_MODAL": {
      return { ...state, modal: action.modal };
    }
    case "SET_NODES": {
      return { ...state, nodes: action.nodes };
    }
    case "SET_DRAGGING": {
      return { ...state, draggingNodeId: action.id };
    }
    case "ADD_CHILD": {
      const parent = state.nodes[action.parentId];
      if (!parent) return state;
      const { newId } = action;
      const newNode: MindNode = {
        id: newId,
        boardId: parent.boardId,
        categoryColor: parent.categoryColor,
        children: [],
        collapsed: false,
        completed: false,
        dueDate: "",
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
        for (const childId of n.children) cascade(childId);
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
      const updated = new Map(Object.entries(state.nodes));
      const remove = (id: string) => {
        const n = updated.get(id);
        if (!n) return;
        for (const childId of n.children) remove(childId);
        updated.delete(id);
      };
      remove(action.id);
      const parent = node.parentId ? updated.get(node.parentId) : null;
      if (parent) {
        const newChildren: string[] = [];
        for (const c of parent.children) {
          if (c !== action.id) newChildren.push(c);
        }
        updated.set(parent.id, { ...parent, children: newChildren });
      }
      return {
        ...state,
        nodes: Object.fromEntries(updated),
        selectedNodeId:
          state.selectedNodeId === action.id ? (node.parentId ?? "root") : state.selectedNodeId,
      };
    }
    case "MOVE_NODE": {
      const node = state.nodes[action.id];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.id]: { ...node, vx: 0, vy: 0, x: action.x, y: action.y },
        },
      };
    }
    default: {
      return state;
    }
  }
}
