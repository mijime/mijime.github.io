export type Priority = "low" | "medium" | "high";

export type CategoryColor = "slate" | "sky" | "emerald" | "rose";

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface MindNode {
  id: string;
  boardId: string;
  text: string;
  parentId: string | null;
  isRoot: boolean;
  completed: boolean;
  collapsed: boolean;
  priority: Priority;
  categoryColor: CategoryColor;
  dueDate: string;
  children: string[];
  x: number;
  y: number;
}

export interface View {
  pan: { x: number; y: number };
  zoom: number;
}

export type Modal =
  | { kind: "edit"; nodeId: string }
  | { kind: "help" }
  | { kind: "board-name"; mode: "create" | "rename"; boardId?: string; initialName?: string }
  | { kind: "board-delete"; boardId: string; boardName: string }
  | { kind: "dsl-editor" }
  | null;

export interface SaveData {
  version: 2;
  board: { id: string; name: string };
  nodes: MindNode[];
}
