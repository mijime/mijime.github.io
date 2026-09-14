import { useState } from "react";
import type { ItemCategory, ItemDef } from "../../items";
import { ITEM_CATEGORIES, ITEM_DEFS } from "../../items";
import type { WallType } from "../../types";
import { FLOOR_TYPES, floorTypeToSwatchStyle, type BrushSize, type ToolMode } from "../tool-mode";
import { btnBase } from "./styles";

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

interface Props {
  tool: ToolMode;
  brush: BrushSize;
  onBrushChange: (brush: BrushSize) => void;
  onToolChange: (tool: ToolMode) => void;
  darkMode: boolean;
}

function BrushToggle({
  brush,
  onChange,
}: {
  brush: BrushSize;
  onChange: (brush: BrushSize) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {(
        [
          { label: "1間", value: 2 },
          { label: "1/2間", value: 1 },
        ] as const
      ).map(({ label, value }) => (
        <button
          key={value}
          title={value === 2 ? "1間(910mm)相当を2x2で描く" : "1/2間(455mm)で描く"}
          style={{
            ...btnBase,
            background: brush === value ? "var(--ink)" : "transparent",
            borderRadius: "4px",
            color: brush === value ? "var(--paper)" : "var(--ink)",
            flex: 1,
            padding: "3px 8px",
          }}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function WallSubPanel({
  tool,
  brush,
  onBrushChange,
  onToolChange,
}: {
  tool: Extract<ToolMode, { kind: "wall" }>;
  brush: BrushSize;
  onBrushChange: (brush: BrushSize) => void;
  onToolChange: (tool: ToolMode) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <BrushToggle brush={brush} onChange={onBrushChange} />
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
            onClick={() => onToolChange({ ...tool, kind: "wall", wallType: type })}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FloorSubPanel({
  tool,
  brush,
  onBrushChange,
  onToolChange,
  darkMode,
}: {
  tool: Extract<ToolMode, { kind: "floor" }>;
  brush: BrushSize;
  onBrushChange: (brush: BrushSize) => void;
  onToolChange: (tool: ToolMode) => void;
  darkMode: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <BrushToggle brush={brush} onChange={onBrushChange} />
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
              onClick={() => onToolChange({ ...tool, floorType: entry.type, kind: "floor" })}
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
    </div>
  );
}

function EraseSubPanel({
  brush,
  onBrushChange,
}: {
  brush: BrushSize;
  onBrushChange: (brush: BrushSize) => void;
}) {
  return <BrushToggle brush={brush} onChange={onBrushChange} />;
}

function ItemSubPanel({
  tool,
  onToolChange,
}: {
  tool: Extract<ToolMode, { kind: "item" }>;
  onToolChange: (tool: ToolMode) => void;
}) {
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

export function SubPanels({ tool, brush, onBrushChange, onToolChange, darkMode }: Props) {
  if (tool.kind === "wall") {
    return (
      <WallSubPanel
        tool={tool}
        brush={brush}
        onBrushChange={onBrushChange}
        onToolChange={onToolChange}
      />
    );
  }
  if (tool.kind === "floor") {
    return (
      <FloorSubPanel
        tool={tool}
        brush={brush}
        onBrushChange={onBrushChange}
        onToolChange={onToolChange}
        darkMode={darkMode}
      />
    );
  }
  if (tool.kind === "erase") {
    return <EraseSubPanel brush={brush} onBrushChange={onBrushChange} />;
  }
  if (tool.kind === "item") {
    return <ItemSubPanel tool={tool} onToolChange={onToolChange} />;
  }
  return null;
}
