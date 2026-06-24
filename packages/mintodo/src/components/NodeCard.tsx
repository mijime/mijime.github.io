import { Check, ChevronDown, ChevronUp, EllipsisVertical, Plus, XCircle } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMindStore } from "../hooks/use-mind-store";
import { isDescendant } from "../store";
import type { MindNode } from "../types";
import { categoryBorderColor, categoryDotClass, formatBadges } from "../lib/badges";

interface Props {
  node: MindNode;
}

export function NodeCard({ node }: Props) {
  const { dispatch, state } = useMindStore();
  const isSelected = state.selectedNodeId === node.id;
  const isMatch = state.searchQuery === "" || node.text.toLowerCase().includes(state.searchQuery);

  const {
    setNodeRef: dragRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({ id: node.id, disabled: node.isRoot });
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: node.id });

  const setNodeRef = (el: HTMLElement | null) => {
    dragRef(el);
    dropRef(el);
  };

  const draggedId = state.draggingNodeId;
  const isRingVisible =
    isOver &&
    draggedId !== null &&
    draggedId !== node.id &&
    !isDescendant(state.nodes, draggedId, node.id);

  if (node.isRoot) {
    return (
      <div
        ref={setNodeRef}
        id={`node-dom-${node.id}`}
        data-node-id={node.id}
        className={`absolute -translate-x-1/2 -translate-y-1/2 p-4 rounded flex items-center justify-between gap-3 min-w-[200px] min-h-[60px] max-w-[280px] ${isSelected ? "node-selected" : ""} ${isMatch ? "" : "opacity-30"} ${isRingVisible ? "ring-2 ring-sky-400" : ""}`}
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
      ref={setNodeRef}
      id={`node-dom-${node.id}`}
      data-node-id={node.id}
      {...attributes}
      {...listeners}
      onClick={() => dispatch({ id: node.id, type: "SELECT" })}
      className={`absolute -translate-x-1/2 -translate-y-1/2 px-4 py-3 rounded border-l-4 flex flex-col justify-between gap-1.5 min-w-[220px] max-w-[320px] ${isSelected ? "node-selected" : ""} ${isMatch ? "" : "opacity-30"} ${isRingVisible ? "ring-2 ring-sky-400" : ""}`}
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
        opacity: isDragging ? 0.4 : 1,
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
            className={`whitespace-pre-wrap break-words max-w-[240px] flex-1 text-sm font-medium ${node.completed ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
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
