import type { FloorType, ItemType, WallType } from "../../types";

export const FLOOR_COLORS: Record<FloorType, { light: string; dark: string }> = {
  wood: { light: "#d4a373", dark: "#8b6f47" },
  water: { light: "#a8d5e5", dark: "#5a8fa0" },
  tatami: { light: "#c8d6af", dark: "#7a8f5c" },
  concrete: { light: "#b0b0b0", dark: "#707070" },
  void: { light: "#e0e0e0", dark: "#404040" },
};

export const WALL_COLORS: Record<
  Exclude<WallType, "none">,
  { light: string; dark: string; opacity?: number }
> = {
  solid: { light: "#333333", dark: "#cccccc" },
  solid_thin: { light: "#666666", dark: "#999999" },
  window_full: { light: "#87ceeb", dark: "#5a8fa0", opacity: 0.5 },
  window_center: { light: "#87ceeb", dark: "#5a8fa0", opacity: 0.5 },
};

export const WALL_HEIGHT_FACTOR = 2.5;

export const WALL_THICKNESS_FACTOR = 0.1;

export const ITEM_COLORS: Record<ItemType, { light: string; dark: string }> = {
  chair: { light: "#8b5a2b", dark: "#5c3a1e" },
  desk: { light: "#a0522d", dark: "#6b3a1e" },
  desk_small: { light: "#a0522d", dark: "#6b3a1e" },
  toilet: { light: "#f0f0f0", dark: "#cccccc" },
  bathtub: { light: "#e0e0e0", dark: "#bbbbbb" },
  kitchen: { light: "#d4a373", dark: "#8b6f47" },
  kitchen_small: { light: "#d4a373", dark: "#8b6f47" },
  washbasin: { light: "#f0f0f0", dark: "#cccccc" },
  washbasin_half: { light: "#f0f0f0", dark: "#cccccc" },
  washbasin_large: { light: "#f0f0f0", dark: "#cccccc" },
  door: { light: "#8b4513", dark: "#5c2e0c" },
  door_slide: { light: "#8b4513", dark: "#5c2e0c" },
  stairs: { light: "#a0522d", dark: "#6b3a1e" },
  fridge: { light: "#c0c0c0", dark: "#808080" },
  washer: { light: "#f0f0f0", dark: "#cccccc" },
  shelf1: { light: "#a0522d", dark: "#6b3a1e" },
  shelf2: { light: "#a0522d", dark: "#6b3a1e" },
  tv: { light: "#1a1a1a", dark: "#0a0a0a" },
  sofa: { light: "#cd853f", dark: "#8b5a2b" },
  bed_single: { light: "#4682b4", dark: "#2f5a7a" },
  bed_double: { light: "#4682b4", dark: "#2f5a7a" },
};

export const ITEM_HEIGHT_FACTORS: Partial<Record<ItemType, number>> = {
  chair: 0.5,
  bed_single: 0.5,
  bed_double: 0.5,
  desk: 0.5,
  desk_small: 0.5,
  washer: 1.5,
  fridge: 1.5,
  shelf1: 1.5,
  shelf2: 1.5,
};

export const ITEM_HEIGHT_FACTOR_DEFAULT = 0.8;

export function getItemHeightFactor(type: ItemType): number {
  return ITEM_HEIGHT_FACTORS[type] ?? ITEM_HEIGHT_FACTOR_DEFAULT;
}

export const ITEM_DEPTH_FACTORS: Partial<Record<ItemType, number>> = {
  tv: 0.15,
};

export function getItemDepthFactor(type: ItemType): number {
  return ITEM_DEPTH_FACTORS[type] ?? 1;
}

export const ITEM_PART_COLORS: Partial<
  Record<ItemType, Record<string, { light: string; dark: string }>>
> = {
  sofa: {
    back: { light: "#8B7D6B", dark: "#7a6e5e" },
    seat: { light: "#A0907D", dark: "#8c7d6a" },
  },
  desk: {
    leg: { light: "#6B5030", dark: "#7a5830" },
    top: { light: "#D4B896", dark: "#b08a60" },
  },
  washbasin_large: {
    mirror: { light: "#E8F4F8", dark: "#1a3a4a" },
    counter: { light: "#EAD8C0", dark: "#6a5a40" },
  },
};

export function getItemPartColor(type: ItemType, part: string, darkMode: boolean): string {
  const entry = ITEM_PART_COLORS[type]?.[part];
  if (entry) return darkMode ? entry.dark : entry.light;
  return darkMode ? "#666666" : "#999999";
}
