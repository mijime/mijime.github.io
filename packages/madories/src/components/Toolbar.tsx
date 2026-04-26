import {
  Armchair,
  BrickWall,
  ChevronDown,
  ChevronUp,
  Download,
  Eraser,
  FolderOpen,
  Link,
  MousePointer2,
  PaintRoller,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
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
  onShare: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  darkMode: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Wall: <BrickWall size={12} />,
  キッチン: <PaintRoller size={12} />,
  リビング: <Armchair size={12} />,
  オフィス: <MousePointer2 size={12} />,
  建具: <BrickWall size={12} />,
  水回り: <PaintRoller size={12} />,
};

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
  onShare,
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

  const toolButtons = [
    { icon: <BrickWall size={14} />, kind: "wall" as const, label: "壁" },
    { icon: <PaintRoller size={14} />, kind: "floor" as const, label: "床" },
    { icon: <Armchair size={14} />, kind: "item" as const, label: "家具" },
    { icon: <Eraser size={14} />, kind: "erase" as const, label: "消す" },
    { icon: <MousePointer2 size={14} />, kind: "select" as const, label: "選択" },
  ];

  return (
    <div
      className="hidden md:flex flex-col gap-4 overflow-y-auto"
      style={{
        background: "var(--toolbar)",
        borderRight: "1px solid var(--border)",
        fontFamily: "IBM Plex Mono, monospace",
        padding: "12px 10px",
        width: "150px",
      }}
    >
      {/* Tool selector */}
      <div className="flex flex-col gap-1.5">
        {toolButtons.map(({ kind, label, icon }) => {
          const active = tool.kind === kind;
          return (
            <button
              key={kind}
              className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono"
              style={{
                background: active ? "var(--ink)" : "transparent",
                border: `1px solid ${active ? "var(--ink)" : "var(--border)"}`,
                color: active ? "var(--paper)" : "var(--ink)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onClick={() => {
                if (kind === "wall") onToolChange({ kind: "wall", wallType: "solid" });
                else if (kind === "floor") onToolChange({ floorType: "wood", kind: "floor" });
                else if (kind === "item") onToolChange({ itemType: "door", kind: "item" });
                else onToolChange({ kind } as ToolMode);
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* Wall sub-options */}
      {tool.kind === "wall" && (
        <div className="flex flex-col gap-1">
          <div style={sectionLabel}>壁タイプ</div>
          {WALL_TYPES.map(({ type, label }) => (
            <button
              key={type}
              className="px-3 py-1 rounded text-xs font-mono text-left"
              style={{
                background: tool.wallType === type ? "var(--accent)" : "transparent",
                border: "1px solid var(--border)",
                color: tool.wallType === type ? "var(--paper)" : "var(--ink)",
                cursor: "pointer",
              }}
              onClick={() => onToolChange({ kind: "wall", wallType: type })}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Floor sub-options */}
      {tool.kind === "floor" && (
        <div className="flex flex-col gap-1">
          <div style={sectionLabel}>床タイプ</div>
          {FLOOR_TYPES.map((entry) => {
            const color = floorTypeToColor(entry.type, darkMode);
            const active = tool.floorType === entry.type;
            return (
              <button
                key={entry.label}
                className="flex items-center gap-2 px-3 py-1 rounded text-xs font-mono"
                style={{
                  background: "transparent",
                  border: active ? "1px solid var(--terra)" : "1px solid var(--border)",
                  color: active ? "var(--terra)" : "var(--ink)",
                  cursor: "pointer",
                }}
                onClick={() => onToolChange({ floorType: entry.type, kind: "floor" })}
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
      )}

      {/* Item sub-options */}
      {tool.kind === "item" && (
        <div className="flex flex-col gap-2">
          {/* Category accordion */}
          {ITEM_CATEGORIES.map((cat) => {
            const items = ITEM_DEFS.filter((d) => d.category === cat);
            const isOpen = openCategories.has(cat);
            return (
              <div key={cat}>
                <button
                  className="flex items-center justify-between w-full px-3 py-1 rounded text-xs font-mono"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--ink)",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleCategory(cat)}
                >
                  <span className="flex items-center gap-1.5">
                    {CATEGORY_ICONS[cat]}
                    {cat}
                  </span>
                  {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-0.5 mt-1 pl-2">
                    {items.map((def) => (
                      <button
                        key={def.type}
                        className="px-2 py-1 rounded text-xs font-mono text-left"
                        style={{
                          background: tool.itemType === def.type ? "var(--accent)" : "transparent",
                          border: "1px solid var(--border)",
                          color: tool.itemType === def.type ? "var(--paper)" : "var(--ink)",
                          cursor: "pointer",
                        }}
                        onClick={() => onToolChange({ itemType: def.type, kind: "item" })}
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
      )}

      {/* Actions */}
      <div
        className="mt-auto flex flex-col gap-1"
        style={{ borderTop: "1px solid var(--border)", paddingTop: "8px" }}
      >
        <div className="flex gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="戻す"
            className="flex-1 py-2 rounded flex items-center justify-center"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              cursor: canUndo ? "pointer" : "default",
              opacity: canUndo ? 1 : 0.4,
            }}
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="進む"
            className="flex-1 py-2 rounded flex items-center justify-center"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              cursor: canRedo ? "pointer" : "default",
              opacity: canRedo ? 1 : 0.4,
            }}
          >
            <Redo2 size={14} />
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onSave}
            title="保存"
            className="flex-1 py-2 rounded flex items-center justify-center"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <Save size={14} />
          </button>
          <button
            onClick={onLoad}
            title="読込"
            className="flex-1 py-2 rounded flex items-center justify-center"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <FolderOpen size={14} />
          </button>
          <button
            onClick={onExportAll}
            title="書き出し (PNG)"
            className="flex-1 py-2 rounded flex items-center justify-center"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <Download size={14} />
          </button>
          <button
            onClick={onShare}
            title="URLでシェア"
            className="flex-1 py-2 rounded flex items-center justify-center"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <Link size={14} />
          </button>
        </div>
        <button
          onClick={() => {
            if (confirm("このレイヤーを全消去しますか？")) {
              onClear();
            }
          }}
          title="全面削除"
          className="py-2 rounded flex items-center justify-center gap-1 text-xs font-mono"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--terra)",
            cursor: "pointer",
          }}
        >
          <Trash2 size={14} />
          削除
        </button>
      </div>
    </div>
  );
}
