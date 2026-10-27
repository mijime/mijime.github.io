import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@mijime/theme/ui";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMindStore } from "../hooks/use-mind-store";
import { isKanbanVisible, sortByDfs } from "../lib/tree";
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

  const dfsOrder = useMemo(() => sortByDfs(state.nodes), [state.nodes]);

  const q = state.searchQuery.toLowerCase();
  const cards: MindNode[] = [];
  for (const id of dfsOrder) {
    const n = state.nodes[id];
    if (!n) continue;
    if (
      n.boardId === state.currentBoardId &&
      n.status === status &&
      !isParentCollapsed(state, n.id) &&
      isKanbanVisible(state.nodes, n.id) &&
      !(state.hideCompleted && n.completed && !n.isRoot) &&
      (state.searchQuery === "" || n.text.toLowerCase().includes(q))
    ) {
      cards.push(n);
    }
  }

  const sortedIds = cards.map((n) => n.id);

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={`w-72 shrink-0 flex flex-col gap-2 rounded p-3 h-full ${isOver ? "ring-2 ring-(--info)" : ""}`}
      style={{ background: "var(--toolbar-bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-1 shrink-0">
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
      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">
        <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
          {cards.map((n: MindNode) => (
            <KanbanCard key={n.id} node={n} />
          ))}
        </SortableContext>
        <Button
          variant="ghost"
          size="sm"
          data-testid={`kanban-column-add-${status}`}
          onClick={() =>
            dispatch({
              modal: { kind: "edit-new", parentId: "root", parentStatusSeed: status },
              type: "OPEN_MODAL",
            })
          }
          className="mt-1 justify-center border-dashed"
        >
          <Plus size={12} /> 追加
        </Button>
      </div>
    </div>
  );
}
