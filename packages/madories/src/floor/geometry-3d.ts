import type { FloorPlan, FloorType, WallType } from "../types";

export interface FloorTile {
  cx: number;
  cy: number;
  floorType: FloorType;
}

export interface WallSegment {
  cx: number;
  cy: number;
  edge: "top" | "left";
  wallType: WallType;
}

export function generateFloorTiles(floor: FloorPlan): FloorTile[] {
  const tiles: FloorTile[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const cell = floor.cells[y * floor.width + x];
      if (cell.floorType !== null) {
        tiles.push({ cx: x, cy: y, floorType: cell.floorType });
      }
    }
  }
  return tiles;
}

export function generateWallSegments(floor: FloorPlan): WallSegment[] {
  const segments: WallSegment[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const cell = floor.cells[y * floor.width + x];
      if (cell.wall.top !== "none") {
        segments.push({ cx: x, cy: y, edge: "top", wallType: cell.wall.top });
      }
      if (cell.wall.left !== "none") {
        segments.push({ cx: x, cy: y, edge: "left", wallType: cell.wall.left });
      }
    }
  }
  return segments;
}
