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
  /** Name assigned to the room this cell belongs to (e.g. "LDK", "トイレ"). */
  roomName?: string;
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
  /**
   * World coordinates of the array cell (0,0). The array is a finite window on
   * an unbounded plane; content is kept `FRAME_PAD` cells away from the window
   * border by normalization, so the border never acts as a wall for content.
   */
  originX: number;
  originY: number;
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
