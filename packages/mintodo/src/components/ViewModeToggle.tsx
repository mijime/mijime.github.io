import { Calendar, FileText, LayoutGrid, Network } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import type { ViewMode } from "../types";

const OPTIONS: { value: ViewMode; label: string; Icon: typeof Network }[] = [
  { value: "mindmap", label: "mindmap", Icon: Network },
  { value: "kanban", label: "kanban", Icon: LayoutGrid },
  { value: "text", label: "text", Icon: FileText },
  { value: "gantt", label: "gantt", Icon: Calendar },
];

export function ViewModeToggle() {
  const { state, dispatch } = useMindStore();
  return (
    <div
      className="flex items-center rounded overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = state.viewMode === value;
        return (
          <button
            key={value}
            type="button"
            data-testid={`view-mode-${value}`}
            aria-pressed={active}
            title={label}
            onClick={() => dispatch({ type: "SET_VIEW_MODE", viewMode: value })}
            className="p-2 transition"
            style={
              active
                ? { background: "var(--terra)", color: "var(--paper)" }
                : { background: "var(--paper)", color: "var(--ink)" }
            }
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
