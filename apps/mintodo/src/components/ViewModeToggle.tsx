import { Calendar, FileText, LayoutGrid, Network } from "lucide-react";
import { IconButton, Toolbar } from "@mijime/theme/ui";
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
    <Toolbar align="start" className="w-auto gap-0.5 p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = state.viewMode === value;
        return (
          <IconButton
            key={value}
            label={label}
            size="icon-sm"
            variant={active ? "primary" : "ghost"}
            data-testid={`view-mode-${value}`}
            aria-pressed={active}
            onClick={() => dispatch({ type: "SET_VIEW_MODE", viewMode: value })}
          >
            <Icon size={14} />
          </IconButton>
        );
      })}
    </Toolbar>
  );
}
