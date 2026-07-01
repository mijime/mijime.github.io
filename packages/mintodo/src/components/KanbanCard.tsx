import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListOrdered, Pencil } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { parentBreadcrumb } from "../lib/breadcrumb";
import type { MindNode } from "../types";
import { TaskCard } from "./TaskCard";

interface Props {
  node: MindNode;
}

export function KanbanCard({ node }: Props) {
  const { dispatch, state } = useMindStore();
  const breadcrumb = parentBreadcrumb(state.nodes, node.id);

  const { setNodeRef, attributes, listeners, isDragging, transform, transition } = useSortable({
    id: node.id,
  });

  const style = {
    background: "var(--paper)",
    borderColor: "var(--border)",
    color: "var(--ink)",
    opacity: isDragging ? 0.4 : 1,
    touchAction: "manipulation",
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-card-${node.id}`}
      data-node-id={node.id}
      {...attributes}
      {...listeners}
      className="rounded border p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
      style={style}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] overflow-hidden text-ellipsis whitespace-nowrap text-left [direction:rtl]"
          title={breadcrumb}
        >
          {breadcrumb}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid={`kanban-card-edit-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({
                modal: { kind: "edit", nodeId: node.id },
                type: "OPEN_MODAL",
              });
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            data-testid={`kanban-card-worklog-${node.id}`}
            className="relative"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({
                modal: { kind: "work-log", nodeId: node.id },
                type: "OPEN_MODAL",
              });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title="作業履歴"
          >
            <ListOrdered size={12} />
            {node.workLogs.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-slate-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                {node.workLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>
      <TaskCard node={node} />
    </div>
  );
}
