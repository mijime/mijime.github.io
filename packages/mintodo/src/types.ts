export type Priority = "low" | "medium" | "high";

export type CategoryColor = "slate" | "sky" | "emerald" | "rose";

export interface MindNode {
  id: string;
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
  vx: number;
  vy: number;
}

export interface View {
  pan: { x: number; y: number };
  zoom: number;
}

export type Modal = { kind: "edit"; nodeId: string } | { kind: "help" } | null;

export interface SaveData {
  version: 1;
  nodes: MindNode[];
}
