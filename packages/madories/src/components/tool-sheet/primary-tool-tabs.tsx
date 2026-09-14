import { Armchair, BrickWall, Eraser, MousePointer2, PaintRoller } from "lucide-react";
import type { BrushSize, ToolMode } from "../tool-mode";
import { btnBase } from "./styles";

const PRIMARY_TOOLS = [
  { icon: BrickWall, kind: "wall" as const, label: "壁" },
  { icon: PaintRoller, kind: "floor" as const, label: "床" },
  { icon: Armchair, kind: "item" as const, label: "家具" },
  { icon: Eraser, kind: "erase" as const, label: "消す" },
  { icon: MousePointer2, kind: "select" as const, label: "選択" },
];

export type PrimaryToolKind = (typeof PRIMARY_TOOLS)[number]["kind"];

export function getToolModeForKind(kind: PrimaryToolKind, brush: BrushSize = 2): ToolMode {
  switch (kind) {
    case "wall": {
      return { brush, kind: "wall", wallType: "solid" };
    }
    case "floor": {
      return { brush, floorType: "wood", kind: "floor" };
    }
    case "item": {
      return { kind: "item", itemType: "door" };
    }
    case "erase": {
      return { brush, kind: "erase" };
    }
    case "select": {
      return { kind: "select" };
    }
  }
}

interface Props {
  tool: ToolMode;
  brush: BrushSize;
  onToolChange: (tool: ToolMode) => void;
}

export function PrimaryToolTabs({ tool, brush, onToolChange }: Props) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {PRIMARY_TOOLS.map(({ kind, label, icon: Icon }) => {
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
            onClick={() => onToolChange(getToolModeForKind(kind, brush))}
          >
            <Icon size={14} />
            <span style={{ fontSize: "9px" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
