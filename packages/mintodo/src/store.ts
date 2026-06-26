import type {
  Board,
  CategoryColor,
  MindNode,
  Modal,
  Priority,
  TaskStatus,
  View,
  ViewMode,
  WorkLogEntry,
} from "./types";
import { nextStatus } from "./lib/status-cycle";
import { applyRadialLayout } from "./layout/radial";

export interface State {
  boards: Board[];
  currentBoardId: string | null;
  draggingNodeId: string | null;
  drawerOpen: boolean;
  hideCompleted: boolean;
  layoutVersion: number;
  modal: Modal;
  viewMode: ViewMode;
  nodes: Record<string, MindNode>;
  searchQuery: string;
  selectedNodeId: string;
  view: View;
}

export type Action =
  | { type: "ADD_BOARD"; board: Board; initialNodes: Record<string, MindNode> }
  | { type: "ADD_CHILD"; newId: string; parentId: string }
  | { type: "DELETE_BOARD"; id: string; nextBoardId: string | null }
  | { type: "DELETE_NODE"; id: string }
  | { type: "OPEN_MODAL"; modal: Modal }
  | { type: "REPARENT"; id: string; newParentId: string }
  | { type: "REORDER_CHILDREN"; nodeId: string; targetId: string }
  | { type: "RENAME_BOARD"; id: string; name: string }
  | { type: "RESET" }
  | { type: "SELECT"; id: string }
  | { type: "SET_BOARDS"; boards: Board[] }
  | { type: "SET_CURRENT_BOARD"; boardId: string | null }
  | { type: "SET_DRAGGING"; id: string | null }
  | { type: "SET_NODES"; nodes: Record<string, MindNode> }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_VIEW"; view: View }
  | { type: "SET_DRAWER"; open: boolean }
  | { type: "SNAP_BACK"; id: string }
  | { type: "TOGGLE_COLLAPSE"; id: string }
  | { type: "TOGGLE_COMPLETE"; id: string }
  | { type: "TOGGLE_DRAWER" }
  | { type: "TOGGLE_HIDE_COMPLETED" }
  | { type: "SET_STATUS"; id: string; status: TaskStatus }
  | { type: "SET_VIEW_MODE"; viewMode: ViewMode }
  | { type: "DELETE_COMPLETED" }
  | {
      type: "CREATE_CHILD";
      newId: string;
      parentId: string;
      text: string;
      priority: Priority;
      categoryColor: CategoryColor;
      dueDate: string;
      completed: boolean;
      status: TaskStatus;
      estimate: number | null;
    }
  | { type: "UPDATE_NODE"; id: string; patch: Partial<MindNode> }
  | { type: "ADD_WORK_LOG"; nodeId: string; entry: WorkLogEntry }
  | { type: "DELETE_WORK_LOG"; nodeId: string; entryId: string };

export function createInitialState(): State {
  return {
    boards: [],
    currentBoardId: null,
    draggingNodeId: null,
    drawerOpen: true,
    hideCompleted: false,
    layoutVersion: 0,
    modal: null,
    viewMode: "mindmap",
    nodes: {},
    searchQuery: "",
    selectedNodeId: "",
    view: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}

function withRadialLayout(state: State, nodes: Record<string, MindNode>): State {
  return { ...state, nodes: applyRadialLayout({ nodes }), layoutVersion: state.layoutVersion + 1 };
}

export function isDescendant(
  nodes: Record<string, MindNode>,
  candidateAncestor: string,
  nodeId: string,
): boolean {
  let cur = nodes[nodeId];
  while (cur && cur.parentId) {
    if (cur.parentId === candidateAncestor) return true;
    cur = nodes[cur.parentId];
  }
  return false;
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
        view: { pan: { x: 0, y: 0 }, zoom: 1 },
      };
    }
    case "RENAME_BOARD": {
      const isCurrentBoard = state.currentBoardId === action.id;
      const root = isCurrentBoard ? state.nodes["root"] : null;
      const nextNodes = root
        ? { ...state.nodes, root: { ...root, text: action.name } }
        : state.nodes;
      return {
        ...state,
        boards: state.boards.map((b) =>
          b.id === action.id ? { ...b, name: action.name, updatedAt: Date.now() } : b,
        ),
        nodes: nextNodes,
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
        startDate: "",
        status: "inbox",
        children: [],
        estimate: null,
        workLogs: [],
        x: 0,
        y: 0,
      };
      return withRadialLayout(
        {
          ...state,
          nodes: { root },
          selectedNodeId: "root",
          view: { pan: { x: 0, y: 0 }, zoom: 1 },
        },
        { root },
      );
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
    case "OPEN_MODAL": {
      return { ...state, modal: action.modal };
    }
    case "SET_NODES": {
      const { root } = action.nodes;
      const nextBoards =
        root && state.currentBoardId
          ? state.boards.map((b) =>
              b.id === state.currentBoardId && b.name !== root.text
                ? { ...b, name: root.text, updatedAt: Date.now() }
                : b,
            )
          : state.boards;
      return withRadialLayout({ ...state, nodes: action.nodes, boards: nextBoards }, action.nodes);
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
        estimate: null,
        workLogs: [],
        collapsed: false,
        completed: false,
        dueDate: "",
        startDate: "",
        status: "inbox",
        isRoot: false,
        parentId: parent.id,
        priority: "medium",
        text: "新規タスク",
        x: 0,
        y: 0,
      };
      const nextNodes: Record<string, MindNode> = {
        ...state.nodes,
        [newId]: newNode,
        [parent.id]: { ...parent, children: [...parent.children, newId] },
      };
      return withRadialLayout(
        {
          ...state,
          nodes: nextNodes,
          selectedNodeId: newId,
        },
        nextNodes,
      );
    }
    case "CREATE_CHILD": {
      const parent = state.nodes[action.parentId];
      if (!parent) return state;
      const newNode: MindNode = {
        id: action.newId,
        boardId: parent.boardId,
        categoryColor: action.categoryColor,
        children: [],
        estimate: action.estimate,
        workLogs: [],
        collapsed: false,
        completed: action.completed,
        dueDate: action.dueDate,
        startDate: "",
        status: action.status,
        isRoot: false,
        parentId: parent.id,
        priority: action.priority,
        text: action.text,
        x: 0,
        y: 0,
      };
      const nextNodes: Record<string, MindNode> = {
        ...state.nodes,
        [action.newId]: newNode,
        [parent.id]: { ...parent, children: [...parent.children, action.newId] },
      };
      return withRadialLayout(
        { ...state, nodes: nextNodes, selectedNodeId: action.newId },
        nextNodes,
      );
    }
    case "UPDATE_NODE": {
      const node = state.nodes[action.id];
      if (!node) return state;
      return {
        ...state,
        nodes: { ...state.nodes, [action.id]: { ...node, ...action.patch } },
      };
    }
    case "SET_DRAWER": {
      return { ...state, drawerOpen: action.open };
    }
    case "TOGGLE_DRAWER": {
      return { ...state, drawerOpen: !state.drawerOpen };
    }
    case "TOGGLE_COMPLETE": {
      const target = state.nodes[action.id];
      if (!target) return state;
      const next: TaskStatus = target.completed ? "inbox" : nextStatus(target.status);
      return reducer(state, { id: action.id, status: next, type: "SET_STATUS" });
    }
    case "TOGGLE_COLLAPSE": {
      const node = state.nodes[action.id];
      if (!node) return state;
      const nextNodes = { ...state.nodes, [action.id]: { ...node, collapsed: !node.collapsed } };
      return withRadialLayout({ ...state, nodes: nextNodes }, nextNodes);
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
      const nextNodes = Object.fromEntries(updated);
      return withRadialLayout(
        {
          ...state,
          nodes: nextNodes,
          selectedNodeId:
            state.selectedNodeId === action.id ? (node.parentId ?? "root") : state.selectedNodeId,
        },
        nextNodes,
      );
    }
    case "REPARENT": {
      const node = state.nodes[action.id];
      const newParent = state.nodes[action.newParentId];
      if (!node || !newParent) return state;
      if (node.isRoot || newParent.id === node.id) return withRadialLayout(state, state.nodes);
      if (node.parentId === action.newParentId) return withRadialLayout(state, state.nodes);
      if (isDescendant(state.nodes, action.id, action.newParentId)) {
        return withRadialLayout(state, state.nodes);
      }
      const oldParent = node.parentId ? state.nodes[node.parentId] : null;
      const nextNodes: Record<string, MindNode> = { ...state.nodes };
      if (oldParent) {
        nextNodes[oldParent.id] = {
          ...oldParent,
          children: oldParent.children.filter((c) => c !== action.id),
        };
      }
      nextNodes[action.id] = { ...node, parentId: action.newParentId };
      nextNodes[action.newParentId] = {
        ...newParent,
        children: [...newParent.children, action.id],
      };
      return withRadialLayout(state, nextNodes);
    }

    case "SET_VIEW_MODE": {
      return { ...state, viewMode: action.viewMode };
    }

    case "SET_STATUS": {
      const target = state.nodes[action.id];
      if (!target) return state;
      const isDone = action.status === "done";
      const updated = { ...state.nodes };
      const cascade = (id: string) => {
        const n = updated[id];
        if (!n) return;
        updated[id] = { ...n, status: action.status, completed: isDone };
        for (const childId of n.children) cascade(childId);
      };
      if (isDone) {
        cascade(action.id);
      } else {
        updated[action.id] = { ...target, status: action.status, completed: false };
      }
      return { ...state, nodes: updated };
    }

    case "SNAP_BACK": {
      return withRadialLayout(state, state.nodes);
    }
    case "DELETE_COMPLETED": {
      const boardId = state.currentBoardId;
      if (!boardId) return state;
      const toDelete = Object.values(state.nodes).filter(
        (n) => n.boardId === boardId && n.completed && !n.isRoot,
      );
      if (toDelete.length === 0) return state;
      const updated = new Map(Object.entries(state.nodes));
      const remove = (id: string) => {
        const n = updated.get(id);
        if (!n) return;
        for (const childId of n.children) remove(childId);
        updated.delete(id);
      };
      for (const n of toDelete) remove(n.id);
      for (const [id, n] of updated) {
        if (n.children.length === 0) continue;
        const filtered = n.children.filter((c) => updated.has(c));
        if (filtered.length !== n.children.length) {
          updated.set(id, { ...n, children: filtered });
        }
      }
      const nextNodes = Object.fromEntries(updated);
      const nextSelected = nextNodes[state.selectedNodeId] ? state.selectedNodeId : "root";
      return withRadialLayout(
        { ...state, nodes: nextNodes, selectedNodeId: nextSelected },
        nextNodes,
      );
    }
    case "ADD_WORK_LOG": {
      const node = state.nodes[action.nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.nodeId]: { ...node, workLogs: [...node.workLogs, action.entry] },
        },
      };
    }
    case "REORDER_CHILDREN": {
      const node = state.nodes[action.nodeId];
      const target = state.nodes[action.targetId];
      if (!node || !target) return state;
      if (node.id === target.id) return state;
      if (node.parentId !== target.parentId || !node.parentId) return state;
      const parent = state.nodes[node.parentId];
      if (!parent) return state;
      const oldIndex = parent.children.indexOf(node.id);
      const newIndex = parent.children.indexOf(target.id);
      if (oldIndex === -1 || newIndex === -1) return state;
      const newChildren = [...parent.children];
      const [item] = newChildren.splice(oldIndex, 1);
      newChildren.splice(newIndex, 0, item!);
      return {
        ...state,
        nodes: { ...state.nodes, [parent.id]: { ...parent, children: newChildren } },
      };
    }
    case "DELETE_WORK_LOG": {
      const node = state.nodes[action.nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.nodeId]: {
            ...node,
            workLogs: node.workLogs.filter((e) => e.id !== action.entryId),
          },
        },
      };
    }
    default: {
      return state;
    }
  }
}
