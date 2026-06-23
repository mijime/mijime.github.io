import { Check, Plus, XCircle } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { categoryDotClass, formatBadges } from "../lib/badges";
import type { MindNode } from "../types";

const DRAG_MIME = "application/x-mindnode-id";

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

function handleDragStart(
  e: React.DragEvent<HTMLDivElement>,
  nodeId: string,
  dispatch: ReturnType<typeof useMindStore>["dispatch"],
) {
  e.dataTransfer.setData(DRAG_MIME, nodeId);
  e.dataTransfer.effectAllowed = "move";
  dispatch({ id: nodeId, type: "SET_DRAGGING" });
}

function handleDragEnd(dispatch: ReturnType<typeof useMindStore>["dispatch"]) {
  dispatch({ id: null, type: "SET_DRAGGING" });
}

interface Props {
  node: MindNode;
}

export function KanbanCard({ node }: Props) {
  const { dispatch, state } = useMindStore();
  const isDone = node.status === "done" || node.completed;
  const breadcrumb = buildBreadcrumb(state.nodes, node.id);
  const { dueHtml, showHigh, showBadgeRow } = formatBadges(node);

  return (
    <div
      data-testid={`kanban-card-${node.id}`}
      data-node-id={node.id}
      draggable
      onDragStart={(e) => handleDragStart(e, node.id, dispatch)}
      onDragEnd={() => handleDragEnd(dispatch)}
      className="rounded border p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
      style={{
        background: "var(--paper)",
        borderColor: "var(--border)",
        color: "var(--ink)",
      }}
    >
      <div className="text-[10px] truncate" style={{ color: "var(--mid)" }} title={breadcrumb}>
        {breadcrumb}
      </div>
      <div className="flex items-start gap-2 min-w-0">
        <button
          type="button"
          data-testid={`kanban-check-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ id: node.id, type: "TOGGLE_COMPLETE" });
          }}
          className="shrink-0"
        >
          {isDone ? (
            <Check className="text-indigo-500" size={18} />
          ) : (
            <XCircle
              className="text-slate-300 dark:text-slate-600 hover:text-indigo-500"
              size={18}
            />
          )}
        </button>
        <span
          className={`truncate text-sm font-medium flex-1 ${isDone ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
        >
          {node.text}
        </span>
        <button
          type="button"
          data-testid={`kanban-add-child-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ modal: { kind: "edit-new", parentId: node.id }, type: "OPEN_MODAL" });
          }}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 w-6 h-6 rounded-md flex items-center justify-center transition shrink-0"
        >
          <Plus size={12} />
        </button>
      </div>
      {showBadgeRow && (
        <div
          className="flex items-center justify-between pt-1.5 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-1.5">
            <span dangerouslySetInnerHTML={{ __html: dueHtml }} />
            {showHigh && (
              <span className="bg-rose-50 text-rose-500 dark:bg-rose-950/20 text-[10px] font-bold px-1.5 py-0.5 rounded">
                重要
              </span>
            )}
          </div>
          <span className={`w-2 h-2 rounded-full ${categoryDotClass(node.categoryColor)}`} />
        </div>
      )}
    </div>
  );
}
