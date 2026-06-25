import { useDraggable } from "@dnd-kit/core";
import { useMindStore } from "../hooks/use-mind-store";
import type { MindNode } from "../types";
import { TaskCard } from "./TaskCard";

function buildBreadcrumb(nodes: Record<string, MindNode>, targetId: string): string {
  const path: string[] = [];
  let cur = nodes[targetId];
  while (cur) {
    path.unshift(cur.text);
    if (!cur.parentId) break;
    cur = nodes[cur.parentId];
    if (!cur) break;
  }
  if (path.length <= 3) return path.join(" / ");
  return `… / ${path.slice(-2).join(" / ")}`;
}

interface Props {
  node: MindNode;
}

export function KanbanCard({ node }: Props) {
  const { dispatch, state } = useMindStore();
  const breadcrumb = buildBreadcrumb(state.nodes, node.id);

  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: node.id });

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-card-${node.id}`}
      data-node-id={node.id}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isDragging) return;
        dispatch({ modal: { kind: "edit", nodeId: node.id }, type: "OPEN_MODAL" });
      }}
      className="rounded border p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
      style={{
        background: "var(--paper)",
        borderColor: "var(--border)",
        color: "var(--ink)",
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
      }}
    >
      <div className="text-[10px] truncate" style={{ color: "var(--mid)" }} title={breadcrumb}>
        {breadcrumb}
      </div>
      <TaskCard node={node} />
    </div>
  );
}
