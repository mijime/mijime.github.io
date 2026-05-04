import type { FloorType, WallType } from "../../types";

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

export const ITEM_COLORS: Record<string, { light: string; dark: string }> = {
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

export const ITEM_HEIGHT_FACTOR = 1.0;
