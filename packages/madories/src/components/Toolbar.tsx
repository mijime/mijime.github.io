import { useState } from "react";
import { ITEM_CATEGORIES, ITEM_DEFS } from "../items";
import type { FloorType, ItemType, WallType } from "../types";

export type ToolMode =
  | { kind: "wall"; wallType: WallType }
  | { kind: "floor"; floorType: FloorType | null }
  | { kind: "item"; itemType: ItemType }
  | { kind: "erase" }
  | { kind: "select" };

const WALL_TYPES: { type: WallType; label: string }[] = [
  { label: "壁", type: "solid" },
  { label: "薄い壁", type: "solid_thin" },
  { label: "全窓", type: "window_full" },
  { label: "中央窓", type: "window_center" },
  { label: "なし", type: "none" },
];

export const FLOOR_TYPES: {
  dark: string | null;
  label: string;
  light: string | null;
  type: FloorType | null;
}[] = [
  { dark: null, label: "空白", light: null, type: null },
  { dark: "#5c4a28", label: "木材", light: "#f5deb3", type: "wood" },
  { dark: "#1a2a3a", label: "水回り", light: "#d6eef8", type: "water" },
  { dark: "#1a3a1a", label: "芝生", light: "#90ee90", type: "grass" },
  { dark: "#3a3a3a", label: "土間", light: "#d0d0d0", type: "concrete" },
  { dark: "#2a2518", label: "吹き抜け", light: "#fff8e8", type: "void" },
];

export function floorTypeToColor(type: FloorType | null, darkMode: boolean): string | null {
  const entry = FLOOR_TYPES.find((e) => e.type === type);
  if (!entry) {
    return null;
  }
  return darkMode ? entry.dark : entry.light;
}

interface Props {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  onClear: () => void;
  onExportAll: () => void;
  onSave: () => void;
  onLoad: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  darkMode: boolean;
}

const btn = (active: boolean, accent = false) => ({
  background: active ? (accent ? "var(--terra)" : "var(--ink)") : "transparent",
  border: `1px solid ${active ? (accent ? "var(--terra)" : "var(--ink)") : "var(--border)"}`,
  color: active ? "var(--paper)" : "var(--ink)",
  cursor: "pointer",
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "11px",
  padding: "3px 8px",
  textAlign: "left" as const,
  width: "100%",
});

const sectionLabel = {
  color: "var(--mid)",
  fontSize: "9px",
  letterSpacing: "0.15em",
  marginBottom: "4px",
  textTransform: "uppercase" as const,
};

export function Toolbar({
  tool,
  onToolChange,
  onClear,
  onExportAll,
  onSave,
  onLoad,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  darkMode,
}: Props) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["建具", "Wall"]));

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  return (
    <div
      className="hidden md:flex flex-col gap-3 overflow-y-auto"
      style={{
        background: "var(--toolbar-bg)",
        borderRight: "1px solid var(--border)",
        fontFamily: "IBM Plex Mono, monospace",
        padding: "10px 8px",
        width: "120px",
      }}
    >
      {/* Select + Erase at top */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onToolChange({ kind: "select" })}
          style={btn(tool.kind === "select")}
        >
          選択
        </button>
        <button
          onClick={() => onToolChange({ kind: "erase" })}
          style={btn(tool.kind === "erase", true)}
        >
          消去
        </button>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* Wall — accordion */}
      <div>
        <button
          onClick={() => toggleCategory("Wall")}
          style={{
            ...btn(false),
            alignItems: "center",
            background: "var(--toolbar-bg)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={sectionLabel}>Wall</span>
          <span style={{ fontSize: "9px" }}>{openCategories.has("Wall") ? "▲" : "▼"}</span>
        </button>
        {openCategories.has("Wall") && (
          <div className="flex flex-col gap-0.5" style={{ marginTop: "2px", paddingLeft: "4px" }}>
            {WALL_TYPES.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => onToolChange({ kind: "wall", wallType: type })}
                style={btn(tool.kind === "wall" && tool.wallType === type)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floor */}
      <div>
        <div style={sectionLabel}>Floor</div>
        <div className="flex flex-col gap-1">
          {FLOOR_TYPES.map((entry) => {
            const color = darkMode ? entry.dark : entry.light;
            const active = tool.kind === "floor" && tool.floorType === entry.type;
            return (
              <button
                key={entry.label}
                onClick={() => onToolChange({ floorType: entry.type, kind: "floor" })}
                style={{
                  alignItems: "center",
                  background: "transparent",
                  border: active ? "1px solid var(--terra)" : "1px solid var(--border)",
                  color: active ? "var(--terra)" : "var(--ink)",
                  cursor: "pointer",
                  display: "flex",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "11px",
                  gap: "6px",
                  padding: "2px 6px",
                }}
              >
                <span
                  style={{
                    background: color ?? undefined,
                    border: "1px solid var(--border)",
                    display: "inline-block",
                    flexShrink: 0,
                    height: "12px",
                    width: "12px",
                  }}
                />
                {entry.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Furniture — accordion by category */}
      <div>
        <div style={sectionLabel}>Furniture</div>
        <div className="flex flex-col gap-0.5">
          {ITEM_CATEGORIES.map((cat) => {
            const items = ITEM_DEFS.filter((d) => d.category === cat);
            const isOpen = openCategories.has(cat);
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  style={{
                    ...btn(false),
                    alignItems: "center",
                    background: "var(--toolbar-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--ink)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{cat}</span>
                  <span style={{ fontSize: "9px" }}>{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div
                    className="flex flex-col gap-0.5"
                    style={{ marginTop: "2px", paddingLeft: "4px" }}
                  >
                    {items.map((def) => (
                      <button
                        key={def.type}
                        onClick={() => onToolChange({ itemType: def.type, kind: "item" })}
                        style={btn(
                          tool.kind === "item" &&
                            (tool as { kind: "item"; itemType: ItemType }).itemType === def.type,
                          true,
                        )}
                      >
                        {def.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear */}
      <div
        className="mt-auto flex flex-col gap-1"
        style={{ borderTop: "1px solid var(--border)", paddingTop: "8px" }}
      >
        <div className="flex gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            style={{ ...btn(false), opacity: canUndo ? 1 : 0.4, width: "50%" }}
          >
            ↩ 戻す
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            style={{ ...btn(false), opacity: canRedo ? 1 : 0.4, width: "50%" }}
          >
            ↪ 進む
          </button>
        </div>
        <button onClick={onSave} style={btn(false)}>
          保存
        </button>
        <button onClick={onLoad} style={btn(false)}>
          読込
        </button>
        <button onClick={onExportAll} style={btn(false)}>
          書き出し (PNG)
        </button>
        <button
          onClick={() => {
            if (confirm("このレイヤーを全消去しますか？")) {
              onClear();
            }
          }}
          style={{ ...btn(false), color: "var(--terra)" }}
        >
          全面削除
        </button>
      </div>
    </div>
  );
}
