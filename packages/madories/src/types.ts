export type WallType = "none" | "solid" | "solid_thin" | "window_full" | "window_center";

export const WALL_WINDOW_SCORE: Partial<Record<WallType, number>> = {
  window_center: 0.5,
  window_full: 1,
};

export type FloorType = "wood" | "water" | "tatami" | "concrete" | "void";

export interface WallFlags {
  top: WallType;
  left: WallType;
}

export type ItemType =
  | "chair"
  | "desk"
  | "toilet"
  | "bathtub"
  | "kitchen"
  | "kitchen_small"
  | "washbasin"
  | "washbasin_half"
  | "washbasin_large"
  | "door"
  | "door_slide"
  | "stairs"
  | "fridge"
  | "washer"
  | "shelf1"
  | "shelf2"
  | "tv"
  | "sofa"
  | "bed_single"
  | "bed_double"
  | "desk_small";

export interface Item {
  type: ItemType;
  rotation: 0 | 90 | 180 | 270;
}

export interface Cell {
  wall: WallFlags;
  floorType: FloorType | null;
  item: Item | null;
}

export interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: Cell[];
}

export interface Building {
  cellSize: number;
  floors: FloorPlan[];
}

export interface SaveData {
  version: 1;
  building: Building;
  activeFloorId: string;
}

export interface CopiedRegion {
  width: number;
  height: number;
  cells: Cell[];
}
