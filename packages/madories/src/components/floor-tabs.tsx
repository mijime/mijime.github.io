import { useState } from "react";
import type { FloorPlan } from "../types";

interface Props {
  floors: FloorPlan[];
  activeFloorId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

export function FloorTabs({ floors, activeFloorId, onSelect, onAdd, onRename, onRemove }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function startEdit(floor: FloorPlan) {
    setEditingId(floor.id);
    setEditingName(floor.name);
  }

  function commitEdit(id: string) {
    if (editingName.trim()) {
      onRename(id, editingName.trim());
    }
    setEditingId(null);
  }

  return (
    <div
      className="flex items-end gap-0 px-4 pt-3"
      style={{ background: "var(--toolbar-bg)", borderBottom: "2px solid var(--terra)" }}
    >
      {floors.map((floor) => (
        <div key={floor.id} className="relative">
          {editingId === floor.id ? (
            <input
              value={editingName}
              onChange={(e) => setEditingName((e.target as HTMLInputElement).value)}
              onBlur={() => commitEdit(floor.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitEdit(floor.id);
                }
                if (e.key === "Escape") {
                  setEditingId(null);
                }
              }}
              className="px-3 py-2 text-xs w-24 outline-none"
              style={{
                background: "var(--paper)",
                border: "1px solid var(--terra)",
                color: "var(--ink)",
                fontFamily: "IBM Plex Mono, monospace",
              }}
            />
          ) : (
            <div
              className="flex items-center"
              style={{
                background: floor.id === activeFloorId ? "var(--paper)" : "transparent",
                borderBottom:
                  floor.id === activeFloorId ? "2px solid var(--terra)" : "2px solid transparent",
                marginBottom: floor.id === activeFloorId ? "-2px" : "0",
              }}
            >
              <button
                onClick={() => onSelect(floor.id)}
                onDoubleClick={() => startEdit(floor)}
                className="px-4 py-2 text-xs tracking-wider"
                style={{
                  color: floor.id === activeFloorId ? "var(--ink)" : "var(--mid)",
                  fontFamily: "IBM Plex Mono, monospace",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {floor.name}
              </button>
              {floor.id === activeFloorId && floors.length > 1 && (
                <button
                  onClick={() => onRemove(floor.id)}
                  className="pr-3 text-xs"
                  style={{ color: "var(--terra)" }}
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
        className="px-4 py-2 text-xs tracking-wider mb-0"
        style={{ color: "var(--mid)", fontFamily: "IBM Plex Mono, monospace" }}
      >
        + ADD
      </button>
    </div>
  );
}
