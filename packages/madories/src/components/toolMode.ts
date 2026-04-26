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
  { dark: "#5c4a28", label: "木材", light: "#f5deb3", type: "wood" },
  { dark: "#1a2a3a", label: "水回り", light: "#d6eef8", type: "water" },
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
