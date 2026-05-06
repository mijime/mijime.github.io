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
