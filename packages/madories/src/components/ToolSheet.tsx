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
import { useEffect, useRef, useState } from "react";
import type { ItemCategory } from "../items";
import { ITEM_CATEGORIES, ITEM_DEFS } from "../items";
import type { ItemType } from "../types";
import type { WallType } from "../types";
import { FLOOR_TYPES, floorTypeToColor, type ToolMode } from "./toolMode";

const WALL_TYPES: { type: WallType; label: string }[] = [
  { label: "壁", type: "solid" },
  { label: "薄い壁", type: "solid_thin" },
  { label: "全窓", type: "window_full" },
  { label: "中央窓", type: "window_center" },
  { label: "なし", type: "none" },
];

const PRIMARY_TOOLS = [
  { icon: <BrickWall size={14} />, kind: "wall" as const, label: "壁" },
  { icon: <PaintRoller size={14} />, kind: "floor" as const, label: "床" },
  { icon: <Armchair size={14} />, kind: "item" as const, label: "家具" },
  { icon: <Eraser size={14} />, kind: "erase" as const, label: "消す" },
  { icon: <MousePointer2 size={14} />, kind: "select" as const, label: "選択" },
];

const ITEMS_BY_CATEGORY = Object.fromEntries(
  ITEM_CATEGORIES.map((cat) => [cat, ITEM_DEFS.filter((d) => d.category === cat)]),
) as Record<ItemCategory, typeof ITEM_DEFS>;

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
  const [clearPending, setClearPending] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastItemTypeRef = useRef<Partial<Record<ItemCategory, ItemType>>>({});
  useEffect(
    () => () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    },
    [],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        height: "100%",
        overflow: "hidden",
        padding: "12px 10px",
      }}
    >
      <div style={{ display: "flex", gap: "4px" }}>
        {PRIMARY_TOOLS.map(({ kind, label, icon }) => {
          const active = tool.kind === kind;
          return (
            <button
              key={kind}
              title={label}
              style={{
                ...btnBase,
                alignItems: "center",
                background: active ? "var(--ink)" : "transparent",
                border: `1px solid ${active ? "var(--ink)" : "var(--border)"}`,
                borderRadius: "6px",
                color: active ? "var(--paper)" : "var(--ink)",
                display: "flex",
                flex: 1,
                flexDirection: "column",
                gap: "2px",
                justifyContent: "center",
                padding: "6px 2px",
              }}
              onClick={() => {
                if (kind === "wall") {
                  onToolChange({ kind: "wall", wallType: "solid" });
                } else if (kind === "floor") {
                  onToolChange({ floorType: "wood", kind: "floor" });
                } else if (kind === "item") {
                  const remembered = lastItemTypeRef.current[itemCategory];
                  const fallback = ITEMS_BY_CATEGORY[itemCategory][0].type;
                  onToolChange({ itemType: remembered ?? fallback, kind: "item" });
                } else {
                  onToolChange({ kind } as ToolMode);
                }
              }}
            >
              {icon}
              <span style={{ fontSize: "9px" }}>{label}</span>
            </button>
          );
        })}
      </div>

      {tool.kind === "wall" && (
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
      )}

      {tool.kind === "floor" && (
        <div style={{ display: "grid", gap: "3px", gridTemplateColumns: "1fr 1fr" }}>
          {FLOOR_TYPES.map((entry) => {
            const color = floorTypeToColor(entry.type, darkMode);
            const active = tool.floorType === entry.type;
            return (
              <button
                key={entry.label}
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
                    background: color ?? undefined,
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
      )}

      {tool.kind === "item" && (
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: "6px",
            overflow: "hidden",
          }}
        >
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
            {ITEMS_BY_CATEGORY[itemCategory].map((def) => {
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
                  onClick={() => {
                    lastItemTypeRef.current[def.category] = def.type;
                    onToolChange({ itemType: def.type, kind: "item" });
                    onClose?.();
                  }}
                >
                  {def.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          paddingTop: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            { disabled: !canUndo, icon: <Undo2 size={14} />, onClick: onUndo, title: "戻す" },
            { disabled: !canRedo, icon: <Redo2 size={14} />, onClick: onRedo, title: "進む" },
            {
              disabled: false,
              icon: <Save size={14} />,
              onClick: () => {
                onSave();
                onClose?.();
              },
              title: "保存",
            },
            {
              disabled: false,
              icon: <FolderOpen size={14} />,
              onClick: () => {
                onLoad();
                onClose?.();
              },
              title: "読込",
            },
            {
              disabled: false,
              icon: <Download size={14} />,
              onClick: () => {
                onExportAll();
                onClose?.();
              },
              title: "書き出し",
            },
            {
              disabled: false,
              icon: <Link size={14} />,
              onClick: () => {
                onShare();
                onClose?.();
              },
              title: "シェア",
            },
            {
              disabled: false,
              icon: <RotateCw size={14} />,
              onClick: () => {
                onRotateFloor();
                onClose?.();
              },
              title: "90°回転",
            },
          ].map(({ icon, onClick, title, disabled }) => (
            <button
              key={title}
              title={title}
              disabled={disabled}
              onClick={onClick}
              style={{
                ...btnBase,
                alignItems: "center",
                borderRadius: "4px",
                cursor: disabled ? "default" : "pointer",
                display: "flex",
                flex: 1,
                justifyContent: "center",
                opacity: disabled ? 0.4 : 1,
                padding: "6px 0",
              }}
            >
              {icon}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (!clearPending) {
              setClearPending(true);
              clearTimerRef.current = setTimeout(() => setClearPending(false), 3000);
            } else {
              if (clearTimerRef.current) {
                clearTimeout(clearTimerRef.current);
              }
              setClearPending(false);
              onClear();
              onClose?.();
            }
          }}
          title="全面削除"
          style={{
            ...btnBase,
            alignItems: "center",
            borderRadius: "4px",
            color: "var(--terra)",
            display: "flex",
            gap: "4px",
            justifyContent: "center",
            padding: "6px 0",
          }}
        >
          <Trash2 size={14} />
          <span>{clearPending ? "本当に削除？" : "削除"}</span>
        </button>
      </div>
    </div>
  );
}

export function ToolSheet(props: Props) {
  const [open, setOpen] = useState(false);
  const currentLabel = PRIMARY_TOOLS.find((t) => t.kind === props.tool.kind)?.label ?? "家具";

  return (
    <>
      <div
        className="hidden md:flex flex-col overflow-hidden"
        style={{
          background: "var(--toolbar)",
          borderRight: "1px solid var(--border)",
          fontFamily: "IBM Plex Mono, monospace",
          height: "100%",
          width: "260px",
        }}
      >
        <ToolPanelContent {...props} />
      </div>

      <button
        className="md:hidden fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5"
        style={{ background: "var(--accent)", color: "var(--paper)" }}
        onClick={() => setOpen(true)}
        aria-label="ツール選択"
      >
        <Pencil size={20} />
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px" }}>
          {currentLabel}
        </span>
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-xl transition-transform duration-200"
        style={{
          background: "var(--toolbar)",
          borderTop: "2px solid var(--border)",
          maxHeight: "80vh",
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div
            style={{
              background: "var(--border)",
              borderRadius: "9999px",
              height: "4px",
              width: "40px",
            }}
          />
        </div>
        <ToolPanelContent {...props} onClose={() => setOpen(false)} />
      </div>
    </>
  );
}
