import type { FloorType, ItemType, WallType } from "../types";

export type ToolMode =
  | { kind: "wall"; wallType: WallType }
  | { kind: "floor"; floorType: FloorType | null }
  | { kind: "item"; itemType: ItemType }
  | { kind: "erase" }
  | { kind: "select" };

export const FLOOR_TYPES: {
  dark: string | null;
  label: string;
  light: string | null;
  type: FloorType | null;
}[] = [
  { dark: null, label: "空白", light: null, type: null },
  { dark: "#5c4a28", label: "フローリング", light: "#f5deb3", type: "wood" },
  { dark: "#1a2a3a", label: "タイル", light: "#d6eef8", type: "water" },
  { dark: "#3a2e1a", label: "畳", light: "#c8b878", type: "tatami" },
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

export function floorTypeToSwatchStyle(
  type: FloorType | null,
  darkMode: boolean,
): React.CSSProperties {
  const color = floorTypeToColor(type, darkMode);
  const base: React.CSSProperties = { background: color ?? undefined };

  if (type === "tatami") {
    const line = darkMode ? "rgba(255,220,120,0.3)" : "rgba(100,70,20,0.25)";
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><line x1='0' y1='5' x2='10' y2='5' stroke='${line}' stroke-width='1'/><rect x='0.5' y='0.5' width='9' height='9' fill='none' stroke='${line}' stroke-width='0.8'/></svg>`;
    return { ...base, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` };
  }

  if (type === "void") {
    const line = darkMode ? "rgba(200,180,140,0.5)" : "rgba(90,74,58,0.5)";
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><line x1='0' y1='0' x2='10' y2='10' stroke='${line}' stroke-width='1' stroke-dasharray='2,2'/><line x1='10' y1='0' x2='0' y2='10' stroke='${line}' stroke-width='1' stroke-dasharray='2,2'/></svg>`;
    return { ...base, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` };
  }

  return base;
}
