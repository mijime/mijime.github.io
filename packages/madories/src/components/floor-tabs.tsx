import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, IconButton, Input } from "@mijime/theme/ui";
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
      className="flex items-end gap-0 overflow-x-auto px-4 pt-3"
      style={{ background: "var(--toolbar-bg)", borderBottom: "2px solid var(--primary)" }}
    >
      {floors.map((floor) => (
        <div key={floor.id} className="relative" style={{ flexShrink: 0 }}>
          {editingId === floor.id ? (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => commitEdit(floor.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitEdit(floor.id);
                }
                if (e.key === "Escape") {
                  setEditingId(null);
                }
              }}
              className="h-8 w-24 text-xs"
            />
          ) : (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelect(floor.id)}
                onDoubleClick={() => startEdit(floor)}
                className="tracking-[0.1em] uppercase"
                style={{
                  color: floor.id === activeFloorId ? "var(--fg)" : "var(--muted)",
                  borderBottom:
                    floor.id === activeFloorId
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                  borderRadius: 0,
                }}
              >
                {floor.name}
              </Button>
              {floor.id === activeFloorId && floors.length > 1 && (
                <IconButton label="この階を削除" size="icon-sm" onClick={() => onRemove(floor.id)}>
                  <X size={12} />
                </IconButton>
              )}
            </div>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd}>
        <Plus size={12} /> ADD
      </Button>
    </div>
  );
}
