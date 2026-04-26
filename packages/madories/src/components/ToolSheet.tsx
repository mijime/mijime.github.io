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
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  darkMode: boolean;
}

export function ToolSheet({
  tool,
  onToolChange,
  onSave,
  onLoad,
  onExportAll,
  onClear,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  darkMode,
}: Props) {
  const [open, setOpen] = useState(false);
  const [itemCategory, setItemCategory] = useState<ItemCategory>("建具");

  const toolButtons: { kind: ToolMode["kind"]; label: string }[] = [
    { kind: "wall", label: "壁" },
    { kind: "floor", label: "床" },
    { kind: "item", label: "家具" },
    { kind: "erase", label: "消す" },
    { kind: "select", label: "選択" },
  ];

  const toolLabel = toolButtons.find((b) => b.kind === tool.kind)?.label ?? "✎";

  return (
    <>
      {/* FAB */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5"
        style={{ background: "var(--accent)", color: "var(--paper)" }}
        onClick={() => setOpen(true)}
        aria-label="ツール選択"
      >
        <span className="text-lg leading-none">✎</span>
        <span className="text-xs font-mono leading-none">{toolLabel}</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-xl transition-transform duration-200"
        style={{
          background: "var(--toolbar)",
          borderTop: "2px solid var(--border)",
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Tool selector */}
          <div className="flex gap-2">
            {toolButtons.map(({ kind, label }) => {
              const active = tool.kind === kind;
              return (
                <button
                  key={kind}
                  className="flex-1 py-2 rounded text-sm font-mono"
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
                  {label}
                </button>
              );
            })}
          </div>

          {/* Sub-options */}
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
              {/* Item list */}
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
              className="flex-1 py-1 rounded text-xs font-mono"
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--ink)",
                opacity: canUndo ? 1 : 0.4,
              }}
              disabled={!canUndo}
              onClick={onUndo}
            >
              ↩ 戻す
            </button>
            <button
              className="flex-1 py-1 rounded text-xs font-mono"
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--ink)",
                opacity: canRedo ? 1 : 0.4,
              }}
              disabled={!canRedo}
              onClick={onRedo}
            >
              ↪ 進む
            </button>
          </div>
          <div className="flex gap-2">
            {[
              { fn: onSave, label: "保存" },
              { fn: onLoad, label: "読込" },
              { fn: onExportAll, label: "書出" },
              { fn: onClear, label: "消去" },
            ].map(({ label, fn }) => (
              <button
                key={label}
                className="flex-1 py-1 rounded text-xs font-mono"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                }}
                onClick={() => {
                  fn();
                  setOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
