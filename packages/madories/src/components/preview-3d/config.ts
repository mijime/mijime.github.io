import type { FloorType } from "../../types";

export const CELL_CM = 91;
export const CM_TO_M = 0.01;

export const WALL_HEIGHT_CM = 240;
// Left壁はtop壁とのT字交差で天面が同一平面になりz-fightingするため0.5cm低くする
export const WALL_HEIGHT_LEFT_CM = 239.5;
export const WALL_THICKNESS_CM = 9;
export const WALL_THIN_THICKNESS_CM = 5;
export const WINDOW_BOTTOM_CM = 90;
export const WINDOW_TOP_CM = 200;
export const FLOOR_THICKNESS_CM = 5;

export type MaterialKey =
  | "floor_wood"
  | "floor_water"
  | "floor_tatami"
  | "floor_concrete"
  | "floor_void"
  | "floor_ext_concrete"
  | "floor_ext_grass"
  | "wall"
  | "wall_thin"
  | "glass"
  | "wood"
  | "wood_light"
  | "ceramic"
  | "metal"
  | "appliance"
  | "fabric"
  | "fabric_dark"
  | "mattress"
  | "screen"
  | "car_body"
  | "fallback";

export interface MaterialDef {
  light: string;
  dark: string;
  roughness: number;
  metalness: number;
  opacity?: number;
}

export const MATERIALS: Record<MaterialKey, MaterialDef> = {
  floor_wood: { light: "#d9b382", dark: "#8b6f47", metalness: 0, roughness: 0.7 },
  floor_water: { light: "#a8d5e5", dark: "#5a8fa0", metalness: 0.1, roughness: 0.2 },
  floor_tatami: { light: "#c8d6af", dark: "#7a8f5c", metalness: 0, roughness: 0.9 },
  floor_concrete: { light: "#b8b8b8", dark: "#707070", metalness: 0, roughness: 0.85 },
  floor_void: { light: "#e0e0e0", dark: "#404040", metalness: 0, roughness: 0.9 },
  floor_ext_concrete: { light: "#b0b0b0", dark: "#808080", metalness: 0, roughness: 0.9 },
  floor_ext_grass: { light: "#7cb87c", dark: "#5a8a5a", metalness: 0, roughness: 1 },
  wall: { light: "#f2efe9", dark: "#8f8b84", metalness: 0, roughness: 0.9 },
  wall_thin: { light: "#e5e1d8", dark: "#7d7972", metalness: 0, roughness: 0.9 },
  glass: { light: "#bfe3f0", dark: "#6fa9bd", metalness: 0.2, opacity: 0.35, roughness: 0.05 },
  wood: { light: "#a07048", dark: "#6b4a2e", metalness: 0, roughness: 0.6 },
  wood_light: { light: "#d4b896", dark: "#a08258", metalness: 0, roughness: 0.6 },
  ceramic: { light: "#f5f5f2", dark: "#c8c8c4", metalness: 0, roughness: 0.25 },
  metal: { light: "#c8c8cc", dark: "#8a8a90", metalness: 0.7, roughness: 0.35 },
  appliance: { light: "#e8e8ea", dark: "#b0b0b4", metalness: 0.3, roughness: 0.4 },
  fabric: { light: "#a0907d", dark: "#8c7d6a", metalness: 0, roughness: 1 },
  fabric_dark: { light: "#8b7d6b", dark: "#7a6e5e", metalness: 0, roughness: 1 },
  mattress: { light: "#eef0f2", dark: "#b8bcc2", metalness: 0, roughness: 0.9 },
  screen: { light: "#1a1a1a", dark: "#0a0a0a", metalness: 0.4, roughness: 0.3 },
  car_body: { light: "#c23a4e", dark: "#8f2a3a", metalness: 0.6, roughness: 0.3 },
  fallback: { light: "#999999", dark: "#666666", metalness: 0, roughness: 0.8 },
};

export const FLOOR_MATERIAL_KEYS: Record<FloorType, MaterialKey> = {
  wood: "floor_wood",
  water: "floor_water",
  tatami: "floor_tatami",
  concrete: "floor_concrete",
  void: "floor_void",
  "exterior-concrete": "floor_ext_concrete",
  "exterior-grass": "floor_ext_grass",
};
