import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useMindStore } from "../hooks/use-mind-store";
import { KanbanCard } from "./KanbanCard";
import type { MindNode, TaskStatus } from "../types";

const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: "受信箱",
  wip: "作業中",
  review: "レビュー",
  done: "完了",
};

interface Props {
  status: TaskStatus;
}

function isParentCollapsed(state: ReturnType<typeof useMindStore>["state"], id: string): boolean {
  const node = state.nodes[id];
  if (!node) return true;
  if (node.isRoot) return false;
  let parent = state.nodes[node.parentId!];
  while (parent) {
    if (parent.collapsed) return true;
    if (parent.isRoot) break;
    parent = state.nodes[parent.parentId!];
  }
  return false;
}

export function KanbanColumn({ status }: Props) {
  const { dispatch, state } = useMindStore();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const cards = Object.values(state.nodes).filter(
    (n) =>
      n.boardId === state.currentBoardId &&
      n.status === status &&
      !isParentCollapsed(state, n.id) &&
      !(state.hideCompleted && n.completed && !n.isRoot),
  );

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={`w-72 shrink-0 flex flex-col gap-2 rounded p-3 ${isOver ? "ring-2 ring-sky-400" : ""}`}
      style={{ background: "var(--toolbar-bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {STATUS_LABELS[status]}
        </h3>
        <span
          className="text-xs"
          style={{ color: "var(--mid)" }}
          data-testid={`kanban-column-count-${status}`}
        >
          {cards.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto min-h-[80px]">
        {cards.map((n: MindNode) => (
          <KanbanCard key={n.id} node={n} />
        ))}
        <button
          type="button"
          data-testid={`kanban-column-add-${status}`}
          onClick={() =>
            dispatch({
              modal: { kind: "edit-new", parentId: "root", parentStatusSeed: status },
              type: "OPEN_MODAL",
            })
          }
          className="mt-1 py-2 rounded text-xs flex items-center justify-center gap-1 transition"
          style={{
            background: "var(--paper)",
            border: "1px dashed var(--border)",
            color: "var(--mid)",
          }}
        >
          <Plus size={12} /> 追加
        </button>
      </div>
    </div>
  );
}
