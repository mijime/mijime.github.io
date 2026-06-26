import { useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useMindStore } from "../hooks/use-mind-store";
import { usePanZoom } from "../hooks/use-pan-zoom";
import { useTween } from "../hooks/use-tween";
import { isDescendant } from "../store";
import { categoryBorderColor } from "../lib/badges";
import { ConnectionLines } from "./ConnectionLines";
import { NodeCard } from "./NodeCard";
import type { MindNode } from "../types";

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

function NodeCardPreview({ node }: { node: MindNode }) {
  const borderColor = categoryBorderColor(node.categoryColor);
  return (
    <div
      className="px-4 py-3 rounded border-l-4 cursor-grabbing"
      style={{
        background: "var(--paper)",
        color: "var(--ink)",
        borderTop: "1px solid var(--border)",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: "0 10px 25px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)",
        minWidth: "220px",
        maxWidth: "320px",
      }}
    >
      <span className="truncate text-sm font-medium">{node.text}</span>
    </div>
  );
}

export function Canvas() {
  const { state, dispatch } = useMindStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  usePanZoom({ containerRef });
  useTween();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const visibleNodes = useMemo(
    () => {
      const q = state.searchQuery.toLowerCase();
      return Object.values(state.nodes).filter((n) => {
        if (state.currentBoardId && n.boardId !== state.currentBoardId) return false;
        if (isParentCollapsed(state, n.id)) return false;
        if (state.hideCompleted && n.completed && !n.isRoot) return false;
        if (state.searchQuery !== "" && !n.text.toLowerCase().includes(q)) return false;
        return true;
      });
    },
    [state.nodes, state.currentBoardId, state.hideCompleted, state.searchQuery],
  );

  function handleDragStart(event: { active: { id: string | number } }) {
    const id = String(event.active.id);
    setActiveId(id);
    dispatch({ id, type: "SET_DRAGGING" });
  }

  function handleDragEnd(event: {
    active: { id: string | number };
    over?: { id: string | number } | null;
  }) {
    const { active, over } = event;
    if (over) {
      const draggedId = String(active.id);
      const targetId = String(over.id);
      if (draggedId !== targetId && !isDescendant(state.nodes, draggedId, targetId)) {
        dispatch({ id: draggedId, newParentId: targetId, type: "REPARENT" });
      }
    }
    dispatch({ id: null, type: "SET_DRAGGING" });
    setActiveId(null);
  }

  function handleDragCancel() {
    dispatch({ id: null, type: "SET_DRAGGING" });
    setActiveId(null);
  }

  const activeNode = activeId ? state.nodes[activeId] : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing canvas-grid relative overflow-hidden bg-[var(--paper)]"
      >
        <ConnectionLines containerRef={containerRef} />
        <div
          className="transform-container absolute w-px h-px top-1/2 left-1/2"
          style={{
            transform: `translate(${state.view.pan.x}px, ${state.view.pan.y}px) scale(${state.view.zoom})`,
          }}
        >
          {visibleNodes.map((n) => (
            <NodeCard key={n.id} node={n} />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeNode && !activeNode.isRoot ? <NodeCardPreview node={activeNode} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
