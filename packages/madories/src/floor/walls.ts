import type { EdgeRef, FloorPlan, WallType } from "../types";

export function hIndex(width: number, x: number, y: number): number {
  return y * width + x;
}

export function vIndex(width: number, x: number, y: number): number {
  return y * (width + 1) + x;
}

export function createHWalls(width: number, height: number): WallType[] {
  return Array.from({ length: width * (height + 1) }, () => "none" as WallType);
}

export function createVWalls(width: number, height: number): WallType[] {
  return Array.from({ length: (width + 1) * height }, () => "none" as WallType);
}

export function getWall(floor: FloorPlan, edge: EdgeRef): WallType {
  return edge.kind === "h"
    ? floor.hWalls[hIndex(floor.width, edge.x, edge.y)]
    : floor.vWalls[vIndex(floor.width, edge.x, edge.y)];
}

export function setWallsPure(floor: FloorPlan, edges: EdgeRef[], type: WallType): FloorPlan {
  const hWalls = [...floor.hWalls];
  const vWalls = [...floor.vWalls];
  for (const e of edges) {
    if (e.kind === "h") {
      if (e.x >= 0 && e.x < floor.width && e.y >= 0 && e.y <= floor.height) {
        hWalls[hIndex(floor.width, e.x, e.y)] = type;
      }
    } else if (e.x >= 0 && e.x <= floor.width && e.y >= 0 && e.y < floor.height) {
      vWalls[vIndex(floor.width, e.x, e.y)] = type;
    }
  }
  return { ...floor, hWalls, vWalls };
}

// CW90: セル (x,y)→(h-1-y, x)、頂点 (vx,vy)→(h-vy, vx)
export function rotateFloorCW90(floor: FloorPlan): FloorPlan {
  const { width, height, cells } = floor;
  const nw = height;
  const nh = width;
  const newCells = cells.map((c) => c);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = cells[y * width + x];
      newCells[x * nw + (height - 1 - y)] = src.item
        ? {
            floorType: src.floorType,
            item: { ...src.item, rotation: ((src.item.rotation + 90) % 360) as 0 | 90 | 180 | 270 },
          }
        : src;
    }
  }
  const hWalls = createHWalls(nw, nh);
  const vWalls = createVWalls(nw, nh);
  // v エッジ (x, y..y+1) → h エッジ ((h-1-y, x)..(h-y, x))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= width; x++) {
      hWalls[hIndex(nw, height - 1 - y, x)] = floor.vWalls[vIndex(width, x, y)];
    }
  }
  // h エッジ (x..x+1, y) → v エッジ ((h-y, x)..(h-y, x+1))
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      vWalls[vIndex(nw, height - y, x)] = floor.hWalls[hIndex(width, x, y)];
    }
  }
  return { ...floor, cells: newCells, hWalls, height: nh, vWalls, width: nw };
}
