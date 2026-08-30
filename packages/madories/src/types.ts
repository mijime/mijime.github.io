export type WallType = "none" | "solid" | "solid_thin" | "window_full" | "window_center";

export const WALL_WINDOW_SCORE: Partial<Record<WallType, number>> = {
  window_center: 0.5,
  window_full: 1,
};

export type FloorType =
  | "wood"
  | "water"
  | "tatami"
  | "concrete"
  | "void"
  | "exterior-concrete"
  | "exterior-grass";

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
  | "desk_small"
  | "car";

export interface Item {
  type: ItemType;
  rotation: 0 | 90 | 180 | 270;
}

export interface Cell {
  floorType: FloorType | null;
  item: Item | null;
}

export interface EdgeRef {
  kind: "h" | "v";
  x: number;
  y: number;
}

export interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: Cell[];
  hWalls: WallType[];
  vWalls: WallType[];
}

export interface Building {
  cellSize: number;
  floors: FloorPlan[];
}

export interface Plan {
  id: string;
  name: string;
  building: Building;
  activeFloorId: string;
  updatedAt: number;
}

export interface SaveData {
  version: 3;
  activePlanId: string;
  plans: Plan[];
}

export interface CopiedRegion {
  width: number;
  height: number;
  cells: Cell[];
  hWalls: WallType[];
  vWalls: WallType[];
}
