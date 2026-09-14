import type { Cell, FloorPlan } from "../types";
import { createHWalls, createVWalls } from "./walls";

/** Empty cells kept between content and the array border (canonical form). */
export const FRAME_PAD = 2;

export interface WorldRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function createCell(): Cell {
  return { floorType: null, item: null };
}

/** World coordinates of an array cell. */
export function worldX(floor: FloorPlan, x: number): number {
  return floor.originX + x;
}

export function arrayIndex(floor: FloorPlan, x: number, y: number): number | null {
  const ax = x - floor.originX;
  const ay = y - floor.originY;
  if (ax < 0 || ay < 0 || ax >= floor.width || ay >= floor.height) {
    return null;
  }
  return ay * floor.width + ax;
}

/**
 * Content bounding box in world coordinates. Content is any cell carrying a
 * floor type, item or room name, plus every non-empty wall edge. Returns null
 * for an empty floor.
 */
export function contentBounds(floor: FloorPlan): WorldRect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const cell = floor.cells[y * floor.width + x];
      if (cell.floorType !== null || cell.item !== null || cell.roomName !== undefined) {
        include(floor.originX + x, floor.originY + y);
      }
    }
  }
  for (let y = 0; y <= floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (floor.hWalls[y * floor.width + x] !== "none") {
        // The edge sits between the cell above and below it; only count the
        // Adjacent cell that actually exists so top/left boundary walls don't
        // Create a phantom empty row/column.
        if (y - 1 >= 0) {
          include(floor.originX + x, floor.originY + y - 1);
        }
        if (y < floor.height) {
          include(floor.originX + x, floor.originY + y);
        }
      }
    }
  }
  for (let x = 0; x <= floor.width; x++) {
    for (let y = 0; y < floor.height; y++) {
      if (floor.vWalls[y * (floor.width + 1) + x] !== "none") {
        if (x - 1 >= 0) {
          include(floor.originX + x - 1, floor.originY + y);
        }
        if (x < floor.width) {
          include(floor.originX + x, floor.originY + y);
        }
      }
    }
  }

  if (minX === Infinity) {
    return null;
  }
  return { maxX, maxY, minX, minY };
}

/** Content bounding box in array coordinates (for the current window), or null. */
export function contentArrayRect(
  floor: FloorPlan,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const b = contentBounds(floor);
  if (!b) {
    return null;
  }
  return {
    x1: b.minX - floor.originX,
    x2: b.maxX - floor.originX,
    y1: b.minY - floor.originY,
    y2: b.maxY - floor.originY,
  };
}

/** Rebuilds the floor as the given world rectangle, copying the overlapping part. */
export function windowFloor(
  floor: FloorPlan,
  wx0: number,
  wy0: number,
  w: number,
  h: number,
): FloorPlan {
  const cells: Cell[] = Array.from({ length: w * h }, createCell);
  for (let ny = 0; ny < h; ny++) {
    const oy = wy0 + ny - floor.originY;
    if (oy < 0 || oy >= floor.height) {
      continue;
    }
    for (let nx = 0; nx < w; nx++) {
      const ox = wx0 + nx - floor.originX;
      if (ox < 0 || ox >= floor.width) {
        continue;
      }
      cells[ny * w + nx] = floor.cells[oy * floor.width + ox];
    }
  }

  const hWalls = createHWalls(w, h);
  for (let ny = 0; ny <= h; ny++) {
    const oy = wy0 + ny - floor.originY;
    if (oy < 0 || oy > floor.height) {
      continue;
    }
    for (let nx = 0; nx < w; nx++) {
      const ox = wx0 + nx - floor.originX;
      if (ox < 0 || ox >= floor.width) {
        continue;
      }
      hWalls[ny * w + nx] = floor.hWalls[oy * floor.width + ox];
    }
  }

  const vWalls = createVWalls(w, h);
  for (let ny = 0; ny < h; ny++) {
    const oy = wy0 + ny - floor.originY;
    if (oy < 0 || oy >= floor.height) {
      continue;
    }
    for (let nx = 0; nx <= w; nx++) {
      const ox = wx0 + nx - floor.originX;
      if (ox < 0 || ox > floor.width) {
        continue;
      }
      vWalls[ny * (w + 1) + nx] = floor.vWalls[oy * (floor.width + 1) + ox];
    }
  }

  return {
    ...floor,
    cells,
    hWalls,
    height: h,
    originX: wx0,
    originY: wy0,
    vWalls,
    width: w,
  };
}

/** Grows the window so `rect` (plus pad) is fully inside. Never shrinks. */
export function ensureWorldBounds(floor: FloorPlan, rect: WorldRect, pad = FRAME_PAD): FloorPlan {
  // When the window is empty (e.g. a fresh floor), frame the target directly
  // Instead of spanning from the window's arbitrary top-left, so a far tap
  // Doesn't allocate a huge mostly-empty window.
  const hasContent = contentBounds(floor) !== null;
  const curMinX = hasContent ? floor.originX : rect.minX - pad;
  const curMinY = hasContent ? floor.originY : rect.minY - pad;
  const curMaxX = hasContent ? floor.originX + floor.width - 1 : rect.maxX + pad;
  const curMaxY = hasContent ? floor.originY + floor.height - 1 : rect.maxY + pad;
  const minX = Math.min(curMinX, rect.minX - pad);
  const minY = Math.min(curMinY, rect.minY - pad);
  const maxX = Math.max(curMaxX, rect.maxX + pad);
  const maxY = Math.max(curMaxY, rect.maxY + pad);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  if (minX === floor.originX && minY === floor.originY && w === floor.width && h === floor.height) {
    return floor;
  }
  return windowFloor(floor, minX, minY, w, h);
}

/** Trims the window to the content bounding box plus pad (canonical form). */
export function normalizeToContent(floor: FloorPlan, pad = FRAME_PAD): FloorPlan {
  const bounds = contentBounds(floor);
  if (!bounds) {
    return floor;
  }
  const wx0 = bounds.minX - pad;
  const wy0 = bounds.minY - pad;
  const w = bounds.maxX - bounds.minX + 1 + pad * 2;
  const h = bounds.maxY - bounds.minY + 1 + pad * 2;
  if (wx0 === floor.originX && wy0 === floor.originY && w === floor.width && h === floor.height) {
    return floor;
  }
  return windowFloor(floor, wx0, wy0, w, h);
}
