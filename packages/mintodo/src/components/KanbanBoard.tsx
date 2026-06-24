import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { TASK_STATUSES, type TaskStatus, type MindNode } from "../types";
import { useMindStore } from "../hooks/use-mind-store";
import { KanbanColumn } from "./KanbanColumn";

function KanbanCardPreview({ node }: { node: MindNode }) {
  return (
    <div
      className="rounded border p-3 cursor-grabbing"
      style={{
        background: "var(--paper)",
        borderColor: "var(--border)",
        color: "var(--ink)",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)",
        width: "288px",
      }}
    >
      <span className="truncate text-sm font-medium">{node.text}</span>
    </div>
  );
}

export function KanbanBoard() {
  const { dispatch, state } = useMindStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: { active: { id: string | number } }) {
    const id = String(event.active.id);
    setActiveId(id);
    dispatch({ id, type: "SET_DRAGGING" });
  }

  function handleDragEnd(event: { active: { id: string | number }; over?: { id: string | number } | null }) {
    const { active, over } = event;
    if (over) {
      const overId = String(over.id);
      const taskStatuses: readonly string[] = TASK_STATUSES;
      if (taskStatuses.includes(overId)) {
        dispatch({ id: String(active.id), status: overId as TaskStatus, type: "SET_STATUS" });
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
      <div data-testid="kanban-board" className="w-full h-full overflow-x-auto">
        <div className="flex flex-row gap-4 p-4 min-h-full">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn key={status} status={status} />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeNode ? <KanbanCardPreview node={activeNode} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
