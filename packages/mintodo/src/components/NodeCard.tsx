import { Check, ChevronDown, ChevronUp, EllipsisVertical, Plus, XCircle } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { isDescendant } from "../store";
import type { MindNode } from "../types";
import { categoryBorderColor, categoryDotClass, formatBadges } from "../lib/badges";

const DRAG_MIME = "application/x-mindnode-id";

interface Props {
  node: MindNode;
}

function handleDragStart(
  e: React.DragEvent<HTMLDivElement>,
  nodeId: string,
  isRoot: boolean,
  onDispatch: ReturnType<typeof useMindStore>["dispatch"],
) {
  if (isRoot) {
    e.preventDefault();
    return;
  }
  e.dataTransfer.setData(DRAG_MIME, nodeId);
  e.dataTransfer.effectAllowed = "move";
  onDispatch({ id: nodeId, type: "SET_DRAGGING" });
}

function handleDragOver(
  e: React.DragEvent<HTMLDivElement>,
  nodeId: string,
  state: ReturnType<typeof useMindStore>["state"],
) {
  const draggedId = state.draggingNodeId;
  if (!draggedId || draggedId === nodeId) return;
  if (isDescendant(state.nodes, draggedId, nodeId)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function handleDragEnter(
  e: React.DragEvent<HTMLDivElement>,
  nodeId: string,
  state: ReturnType<typeof useMindStore>["state"],
) {
  const draggedId = state.draggingNodeId;
  if (!draggedId || draggedId === nodeId) return;
  if (isDescendant(state.nodes, draggedId, nodeId)) return;
  e.currentTarget.classList.add("ring-2", "ring-sky-400");
}

function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
  e.currentTarget.classList.remove("ring-2", "ring-sky-400");
}

function handleDrop(
  e: React.DragEvent<HTMLDivElement>,
  nodeId: string,
  state: ReturnType<typeof useMindStore>["state"],
  onDispatch: ReturnType<typeof useMindStore>["dispatch"],
) {
  e.preventDefault();
  e.currentTarget.classList.remove("ring-2", "ring-sky-400");
  const draggedId = e.dataTransfer.getData(DRAG_MIME);
  if (!draggedId || draggedId === nodeId) return;
  if (isDescendant(state.nodes, draggedId, nodeId)) return;
  onDispatch({ id: draggedId, newParentId: nodeId, type: "REPARENT" });
}

function handleDragEnd(onDispatch: ReturnType<typeof useMindStore>["dispatch"]) {
  for (const el of document.querySelectorAll(".ring-2.ring-sky-400")) {
    el.classList.remove("ring-2", "ring-sky-400");
  }
  onDispatch({ id: null, type: "SET_DRAGGING" });
}

export function NodeCard({ node }: Props) {
  const { dispatch, state } = useMindStore();
  const isSelected = state.selectedNodeId === node.id;
  const isMatch = state.searchQuery === "" || node.text.toLowerCase().includes(state.searchQuery);

  if (node.isRoot) {
    return (
      <div
        id={`node-dom-${node.id}`}
        data-node-id={node.id}
        draggable={!node.isRoot}
        onDragStart={(e) => handleDragStart(e, node.id, node.isRoot, dispatch)}
        onDragOver={(e) => handleDragOver(e, node.id, state)}
        onDragEnter={(e) => handleDragEnter(e, node.id, state)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, node.id, state, dispatch)}
        onDragEnd={() => handleDragEnd(dispatch)}
        className={`absolute -translate-x-1/2 -translate-y-1/2 p-4 rounded flex items-center justify-between gap-3 min-w-[200px] min-h-[60px] max-w-[280px] ${isSelected ? "node-selected" : ""} ${isMatch ? "" : "opacity-30"}`}
        style={{
          left: node.x,
          top: node.y,
          background: "var(--terra)",
          color: "var(--paper)",
          border: "2px solid var(--terra)",
          fontFamily: '"Crimson Pro", serif',
          fontWeight: 600,
        }}
      >
        <div className="flex-1 select-none pr-1 truncate">{node.text}</div>
        <button
          type="button"
          data-testid="add-child-root"
          className="w-7 h-7 rounded flex items-center justify-center transition"
          style={{ background: "rgba(255,255,255,0.2)" }}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ modal: { kind: "edit-new", parentId: node.id }, type: "OPEN_MODAL" });
          }}
        >
          <Plus size={12} />
        </button>
      </div>
    );
  }

  const borderColor = categoryBorderColor(node.categoryColor);
  const priBorder = node.priority === "high";
  const { dueHtml, showHigh, showBadgeRow } = formatBadges(node);

  return (
    <div
      id={`node-dom-${node.id}`}
      data-node-id={node.id}
      draggable={!node.isRoot}
      onDragStart={(e) => handleDragStart(e, node.id, node.isRoot, dispatch)}
      onDragOver={(e) => handleDragOver(e, node.id, state)}
      onDragEnter={(e) => handleDragEnter(e, node.id, state)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, node.id, state, dispatch)}
      onDragEnd={() => handleDragEnd(dispatch)}
      onClick={() => dispatch({ id: node.id, type: "SELECT" })}
      className={`absolute -translate-x-1/2 -translate-y-1/2 px-4 py-3 rounded border-l-4 flex flex-col justify-between gap-1.5 min-w-[220px] max-w-[320px] ${isSelected ? "node-selected" : ""} ${isMatch ? "" : "opacity-30"}`}
      style={{
        left: node.x,
        top: node.y,
        background: "var(--paper)",
        color: "var(--ink)",
        borderTop: "1px solid var(--border)",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: priBorder ? "0 0 0 1px var(--terra)" : undefined,
      }}
    >
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            type="button"
            className="flex items-center justify-center shrink-0 mt-0.5"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ id: node.id, type: "TOGGLE_COMPLETE" });
            }}
          >
            {node.completed ? (
              <Check className="text-indigo-500" size={18} />
            ) : (
              <XCircle
                className="text-slate-300 dark:text-slate-600 hover:text-indigo-500"
                size={18}
              />
            )}
          </button>
          <span
            className={`truncate flex-1 text-sm font-medium ${node.completed ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
          >
            {node.text}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {node.children.length > 0 && (
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ id: node.id, type: "TOGGLE_COLLAPSE" });
              }}
            >
              {node.collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
          )}
          <button
            type="button"
            data-testid="ellipsis"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ modal: { kind: "edit", nodeId: node.id }, type: "OPEN_MODAL" });
            }}
          >
            <EllipsisVertical size={12} />
          </button>
          <button
            type="button"
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 w-6 h-6 rounded-md flex items-center justify-center transition"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ modal: { kind: "edit-new", parentId: node.id }, type: "OPEN_MODAL" });
            }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
      {showBadgeRow && (
        <div className="flex items-center justify-between w-full pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
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
