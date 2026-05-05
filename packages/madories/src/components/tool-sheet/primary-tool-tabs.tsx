import {
  Armchair,
  BrickWall,
  Eraser,
  MousePointer2,
  PaintRoller,
} from "lucide-react";
import type { ToolMode } from "../tool-mode";

const PRIMARY_TOOLS = [
  { icon: BrickWall, kind: "wall" as const, label: "壁" },
  { icon: PaintRoller, kind: "floor" as const, label: "床" },
  { icon: Armchair, kind: "item" as const, label: "家具" },
  { icon: Eraser, kind: "erase" as const, label: "消す" },
  { icon: MousePointer2, kind: "select" as const, label: "選択" },
];

export type PrimaryToolKind = (typeof PRIMARY_TOOLS)[number]["kind"];

export function getToolModeForKind(kind: PrimaryToolKind): ToolMode {
  switch (kind) {
    case "wall": {
      return { kind: "wall", wallType: "solid" };
    }
    case "floor": {
      return { kind: "floor", floorType: "wood" };
    }
    case "item": {
      return { kind: "item", itemType: "door" };
    }
    case "erase": {
      return { kind: "erase" };
    }
    case "select": {
      return { kind: "select" };
    }
  }
}

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
}

export function PrimaryToolTabs({ tool, onToolChange }: Props) {
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
            onClick={() => onToolChange(getToolModeForKind(kind))}
          >
            <Icon size={14} />
            <span style={{ fontSize: "9px" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
