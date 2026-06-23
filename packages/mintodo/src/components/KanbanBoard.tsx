import { TASK_STATUSES } from "../types";
import { KanbanColumn } from "./KanbanColumn";

export function KanbanBoard() {
  return (
    <div data-testid="kanban-board" className="w-full flex-1 overflow-x-auto">
      <div className="flex flex-row gap-4 p-4 min-h-full" style={{ paddingTop: 80 }}>
        {TASK_STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} />
        ))}
      </div>
    </div>
  );
}
