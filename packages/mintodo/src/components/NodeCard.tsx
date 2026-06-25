import { ChevronDown, ChevronUp, EllipsisVertical, Plus } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMindStore } from "../hooks/use-mind-store";
import { isDescendant } from "../store";
import type { MindNode } from "../types";
import { categoryBorderColor } from "../lib/badges";
import { TaskCard } from "./TaskCard";

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

  return (
    <div
      ref={setNodeRef}
      id={`node-dom-${node.id}`}
      data-node-id={node.id}
      {...attributes}
      {...listeners}
      onClick={() => {
        dispatch({ id: node.id, type: "SELECT" });
        dispatch({ modal: { kind: "edit", nodeId: node.id }, type: "OPEN_MODAL" });
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 px-4 py-3 rounded border-l-4 flex flex-col gap-1.5 min-w-[220px] max-w-[320px] ${isSelected ? "node-selected" : ""} ${isMatch ? "" : "opacity-30"} ${isRingVisible ? "ring-2 ring-sky-400" : ""}`}
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
        touchAction: "none",
      }}
    >
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex-1 min-w-0">
          <TaskCard node={node} />
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
        </div>
      </div>
    </div>
  );
}
