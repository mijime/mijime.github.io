import { useState } from "react";
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
          color: "var(--mid)",
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
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName((e.target as HTMLInputElement).value)}
              onBlur={() => commitEdit(plan.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitEdit(plan.id);
                }
                if (e.key === "Escape") {
                  setEditingId(null);
                }
              }}
              className="px-2 py-0.5 text-xs w-28 outline-none"
              style={{
                background: "var(--paper)",
                border: "1px solid var(--terra)",
                color: "var(--ink)",
                fontFamily: "IBM Plex Mono, monospace",
              }}
            />
          ) : (
            <div className="flex items-center">
              <button
                onClick={() => onSelect(plan.id)}
                onDoubleClick={() => startEdit(plan)}
                className="px-3 py-1 text-xs"
                style={{
                  background: plan.id === activePlanId ? "var(--paper)" : "transparent",
                  border:
                    plan.id === activePlanId ? "1px solid var(--terra)" : "1px solid transparent",
                  borderRadius: "4px",
                  color: plan.id === activePlanId ? "var(--ink)" : "var(--mid)",
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                {plan.name}
              </button>
              {plan.id === activePlanId && plans.length > 1 && (
                <button
                  onClick={() => onRemove(plan.id)}
                  className="px-1 text-xs"
                  style={{ color: "var(--terra)" }}
                  title="このプランを削除"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="px-3 py-1 text-xs"
        style={{ color: "var(--mid)", fontFamily: "IBM Plex Mono, monospace" }}
      >
        + NEW
      </button>
    </div>
  );
}
