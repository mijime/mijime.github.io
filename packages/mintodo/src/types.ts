export type Priority = "low" | "medium" | "high";

export type CategoryColor = "slate" | "sky" | "emerald" | "rose";

export type TaskStatus = "inbox" | "wip" | "review" | "done";

export const TASK_STATUSES: readonly TaskStatus[] = ["inbox", "wip", "review", "done"] as const;

export type ViewMode = "mindmap" | "kanban" | "text";

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
  status: TaskStatus;
  children: string[];
  estimate: number | null;
  workLogs: WorkLogEntry[];
  x: number;
  y: number;
}

export interface View {
  pan: { x: number; y: number };
  zoom: number;
}

export type Modal =
  | { kind: "edit"; nodeId: string }
  | { kind: "edit-new"; parentId: string; parentStatusSeed?: TaskStatus }
  | { kind: "help" }
  | { kind: "board-name"; mode: "create" | "rename"; boardId?: string; initialName?: string }
  | { kind: "board-delete"; boardId: string; boardName: string }
  | { kind: "work-log"; nodeId: string }
  | null;

export interface WorkLogEntry {
  id: string;
  timestamp: number;
  text: string;
}

export interface SaveData {
  version: 2;
  board: { id: string; name: string };
  nodes: MindNode[];
}
