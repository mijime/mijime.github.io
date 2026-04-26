import {
  Armchair,
  BrickWall,
  Download,
  Eraser,
  FolderOpen,
  Link,
  MousePointer2,
  PaintRoller,
  Pencil,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import type { ItemCategory } from "../items";
import { ITEM_CATEGORIES, ITEM_DEFS } from "../items";
import type { WallType } from "../types";
import { FLOOR_TYPES, floorTypeToColor, type ToolMode } from "./Toolbar";

const WALL_TYPES: { type: WallType; label: string }[] = [
  { label: "壁", type: "solid" },
  { label: "薄い壁", type: "solid_thin" },
  { label: "全窓", type: "window_full" },
  { label: "中央窓", type: "window_center" },
  { label: "なし", type: "none" },
];

interface Props {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  onSave: () => void;
  onLoad: () => void;
  onExportAll: () => void;
  onShare: () => void;
  onClear: () => void;
  onRotateFloor: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  darkMode: boolean;
}

const toolButtons = [
  { icon: <BrickWall size={14} />, kind: "wall" as const, label: "壁" },
  { icon: <PaintRoller size={14} />, kind: "floor" as const, label: "床" },
  { icon: <Armchair size={14} />, kind: "item" as const, label: "家具" },
  { icon: <Eraser size={14} />, kind: "erase" as const, label: "消す" },
  { icon: <MousePointer2 size={14} />, kind: "select" as const, label: "選択" },
];

function ToolPanelContent({
  tool,
  onToolChange,
  onSave,
  onLoad,
  onExportAll,
  onShare,
  onClear,
  onRotateFloor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  darkMode,
  onClose,
}: Props & { onClose?: () => void }) {
  const [itemCategory, setItemCategory] = useState<ItemCategory>("建具");

  return (
    <div className="px-4 pb-6 space-y-4">
      {/* Tool selector */}
      <div className="flex gap-2">
        {toolButtons.map(({ kind, label, icon }) => {
          const active = tool.kind === kind;
          return (
            <button
              key={kind}
              className="flex-1 py-2 rounded flex flex-col items-center gap-1 text-xs font-mono"
              style={{
                background: active ? "var(--ink)" : "transparent",
                border: `1px solid ${active ? "var(--ink)" : "var(--border)"}`,
                color: active ? "var(--paper)" : "var(--ink)",
              }}
              onClick={() => {
                if (kind === "wall") {
                  onToolChange({ kind: "wall", wallType: "solid" });
                } else if (kind === "floor") {
                  onToolChange({ floorType: "wood", kind: "floor" });
                } else if (kind === "item") {
                  onToolChange({ itemType: "door", kind: "item" });
                } else {
                  onToolChange({ kind } as ToolMode);
                }
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* Wall sub-options */}
      {tool.kind === "wall" && (
        <div className="flex flex-wrap gap-2">
          {WALL_TYPES.map(({ type, label }) => (
            <button
              key={type}
              className="px-3 py-1 rounded text-xs font-mono"
              style={{
                background: tool.wallType === type ? "var(--accent)" : "transparent",
                border: "1px solid var(--border)",
                color: tool.wallType === type ? "var(--paper)" : "var(--ink)",
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
        <div className="space-y-2">
          {/* Category tabs */}
          <div className="flex gap-1 flex-wrap">
            {ITEM_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className="px-2 py-1 rounded text-xs font-mono"
                style={{
                  background: itemCategory === cat ? "var(--ink)" : "transparent",
                  border: "1px solid var(--border)",
                  color: itemCategory === cat ? "var(--paper)" : "var(--ink)",
                }}
                onClick={() => setItemCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {ITEM_DEFS.filter((d) => d.category === itemCategory).map((def) => (
              <button
                key={def.type}
                className="px-2 py-1 rounded text-xs font-mono"
                style={{
                  background:
                    tool.kind === "item" && tool.itemType === def.type
                      ? "var(--accent)"
                      : "transparent",
                  border: "1px solid var(--border)",
                  color:
                    tool.kind === "item" && tool.itemType === def.type
                      ? "var(--paper)"
                      : "var(--ink)",
                }}
                onClick={() => onToolChange({ itemType: def.type, kind: "item" })}
              >
                {def.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          className="flex-1 py-2 rounded flex items-center justify-center"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--ink)",
            opacity: canUndo ? 1 : 0.4,
          }}
          disabled={!canUndo}
          onClick={onUndo}
          title="戻す"
        >
          <Undo2 size={16} />
        </button>
        <button
          className="flex-1 py-2 rounded flex items-center justify-center"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--ink)",
            opacity: canRedo ? 1 : 0.4,
          }}
          disabled={!canRedo}
          onClick={onRedo}
          title="進む"
        >
          <Redo2 size={16} />
        </button>
        <button
          className="flex-1 py-2 rounded flex items-center justify-center"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
          title="保存"
          onClick={() => {
            onSave();
            onClose?.();
          }}
        >
          <Save size={16} />
        </button>
        <button
          className="flex-1 py-2 rounded flex items-center justify-center"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
          title="読込"
          onClick={() => {
            onLoad();
            onClose?.();
          }}
        >
          <FolderOpen size={16} />
        </button>
        <button
          className="flex-1 py-2 rounded flex items-center justify-center"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
          title="書き出し (PNG)"
          onClick={() => {
            onExportAll();
            onClose?.();
          }}
        >
          <Download size={16} />
        </button>
        <button
          className="flex-1 py-2 rounded flex items-center justify-center"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
          title="URLでシェア"
          onClick={() => {
            onShare();
            onClose?.();
          }}
        >
          <Link size={16} />
        </button>
        <button
          className="flex-1 py-2 rounded flex items-center justify-center"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
          title="90°回転"
          onClick={() => {
            onRotateFloor();
            onClose?.();
          }}
        >
          <RotateCw size={16} />
        </button>
        <button
          className="flex-1 py-2 rounded flex items-center justify-center"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--terra)",
          }}
          title="全面削除"
          onClick={() => {
            onClear();
            onClose?.();
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export function ToolSheet(props: Props) {
  const [open, setOpen] = useState(false);

  const toolLabel = toolButtons.find((b) => b.kind === props.tool.kind)?.label ?? "";

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-col overflow-y-auto pt-4 gap-0"
        style={{
          background: "var(--toolbar)",
          borderRight: "1px solid var(--border)",
          width: "260px",
        }}
      >
        <ToolPanelContent {...props} />
      </div>

      {/* Mobile FAB */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5"
        style={{ background: "var(--accent)", color: "var(--paper)" }}
        onClick={() => setOpen(true)}
        aria-label="ツール選択"
      >
        <Pencil size={20} />
        <span className="text-xs font-mono leading-none">{toolLabel}</span>
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile bottom sheet */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-xl transition-transform duration-200"
        style={{
          background: "var(--toolbar)",
          borderTop: "2px solid var(--border)",
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
        </div>
        <ToolPanelContent {...props} onClose={() => setOpen(false)} />
      </div>
    </>
  );
}
