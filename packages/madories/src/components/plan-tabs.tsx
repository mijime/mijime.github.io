import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, IconButton, Input } from "@mijime/theme/ui";
import type { Plan } from "../types";

interface Props {
  plans: Plan[];
  activePlanId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

export function PlanTabs({ plans, activePlanId, onSelect, onAdd, onRename, onRemove }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setEditingName(plan.name);
  }

  function commitEdit(id: string) {
    if (editingName.trim()) {
      onRename(id, editingName.trim());
    }
    setEditingId(null);
  }

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto px-4 py-1.5"
      style={{
        background: "var(--toolbar-bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          color: "var(--muted)",
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "10px",
          letterSpacing: "0.12em",
          marginRight: "8px",
        }}
      >
        PLAN
      </span>
      {plans.map((plan) => (
        <div key={plan.id} className="flex items-center" style={{ flexShrink: 0 }}>
          {editingId === plan.id ? (
            <Input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => commitEdit(plan.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitEdit(plan.id);
                }
                if (e.key === "Escape") {
                  setEditingId(null);
                }
              }}
              className="h-7 w-28 text-xs"
            />
          ) : (
            <div className="flex items-center">
              <Button
                variant={plan.id === activePlanId ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onSelect(plan.id)}
                onDoubleClick={() => startEdit(plan)}
              >
                {plan.name}
              </Button>
              {plan.id === activePlanId && plans.length > 1 && (
                <IconButton
                  label="このプランを削除"
                  size="icon-sm"
                  onClick={() => onRemove(plan.id)}
                >
                  <X size={12} />
                </IconButton>
              )}
            </div>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd}>
        <Plus size={12} /> NEW
      </Button>
    </div>
  );
}
