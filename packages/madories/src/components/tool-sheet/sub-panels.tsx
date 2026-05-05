import { useState } from "react";
import type { ItemCategory, ItemDef } from "../../items";
import { ITEM_CATEGORIES, ITEM_DEFS } from "../../items";
import type { WallType } from "../../types";
import { FLOOR_TYPES, floorTypeToSwatchStyle, type ToolMode } from "../tool-mode";

const WALL_TYPES: { type: WallType; label: string }[] = [
  { label: "壁", type: "solid" },
  { label: "開口部", type: "solid_thin" },
  { label: "全窓", type: "window_full" },
  { label: "半窓", type: "window_center" },
  { label: "なし", type: "none" },
];

const ITEMS_BY_CATEGORY = Object.fromEntries(
  ITEM_CATEGORIES.map((cat) => [cat, ITEM_DEFS.filter((d) => d.category === cat)]),
) as Record<ItemCategory, ItemDef[]>;

const btnBase = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--ink)",
  cursor: "pointer" as const,
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "11px",
};

interface Props {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  darkMode: boolean;
}

function WallSubPanel({ tool, onToolChange }: { tool: Extract<ToolMode, { kind: "wall" }>; onToolChange: (tool: ToolMode) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {WALL_TYPES.map(({ type, label }) => (
        <button
          key={type}
          style={{
            ...btnBase,
            background: tool.wallType === type ? "var(--accent)" : "transparent",
            borderRadius: "4px",
            color: tool.wallType === type ? "var(--paper)" : "var(--ink)",
            padding: "3px 8px",
          }}
          onClick={() => onToolChange({ kind: "wall", wallType: type })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FloorSubPanel({ tool, onToolChange, darkMode }: { tool: Extract<ToolMode, { kind: "floor" }>; onToolChange: (tool: ToolMode) => void; darkMode: boolean }) {
  return (
    <div style={{ display: "grid", gap: "3px", gridTemplateColumns: "1fr 1fr" }}>
      {FLOOR_TYPES.map((entry) => {
        const active = tool.floorType === entry.type;
        return (
          <button
            key={entry.type ?? "blank"}
            style={{
              ...btnBase,
              alignItems: "center",
              border: active ? "1px solid var(--terra)" : "1px solid var(--border)",
              borderRadius: "4px",
              color: active ? "var(--terra)" : "var(--ink)",
              display: "flex",
              gap: "6px",
              padding: "3px 6px",
            }}
            onClick={() => onToolChange({ floorType: entry.type, kind: "floor" })}
          >
            <span
              style={{
                ...floorTypeToSwatchStyle(entry.type, darkMode),
                border: "1px solid var(--border)",
                borderRadius: "2px",
                display: "inline-block",
                flexShrink: 0,
                height: "10px",
                width: "10px",
              }}
            />
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}

function ItemSubPanel({ tool, onToolChange }: { tool: Extract<ToolMode, { kind: "item" }>; onToolChange: (tool: ToolMode) => void }) {
  const [itemCategory, setItemCategory] = useState<ItemCategory>(ITEM_CATEGORIES[0]);
  const items = ITEMS_BY_CATEGORY[itemCategory];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
        {ITEM_CATEGORIES.map((cat) => (
          <button
            key={cat}
            style={{
              ...btnBase,
              background: itemCategory === cat ? "var(--ink)" : "transparent",
              borderRadius: "4px",
              color: itemCategory === cat ? "var(--paper)" : "var(--ink)",
              padding: "3px 8px",
            }}
            onClick={() => setItemCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", overflowY: "auto" }}>
        {items.map((def) => {
          const active = tool.itemType === def.type;
          return (
            <button
              key={def.type}
              style={{
                ...btnBase,
                background: active ? "var(--accent)" : "transparent",
                borderRadius: "4px",
                color: active ? "var(--paper)" : "var(--ink)",
                overflow: "hidden",
                padding: "4px 8px",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onClick={() => onToolChange({ itemType: def.type, kind: "item" })}
            >
              {def.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SubPanels({ tool, onToolChange, darkMode }: Props) {
  if (tool.kind === "wall") {
    return <WallSubPanel tool={tool} onToolChange={onToolChange} />;
  }
  if (tool.kind === "floor") {
    return <FloorSubPanel tool={tool} onToolChange={onToolChange} darkMode={darkMode} />;
  }
  if (tool.kind === "item") {
    return <ItemSubPanel tool={tool} onToolChange={onToolChange} />;
  }
  return null;
}
