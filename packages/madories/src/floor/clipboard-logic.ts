import { computeBounds } from "../draw/export";
import { hIndex, vIndex } from "./walls";
import type { CopiedRegion, FloorPlan, WallType } from "../types";

export function normalizeSelection(sel: { x1: number; y1: number; x2: number; y2: number }) {
  return {
    x1: Math.min(sel.x1, sel.x2),
    x2: Math.max(sel.x1, sel.x2),
    y1: Math.min(sel.y1, sel.y2),
    y2: Math.max(sel.y1, sel.y2),
  };
}

/**
 * Copies the selected world region. The selection is in world coordinates and
 * is clamped to the current window; cells outside the window simply don't
 * exist and are ignored.
 */
export function copyRegion(
  floor: FloorPlan,
  sel: { x1: number; y1: number; x2: number; y2: number },
): CopiedRegion | null {
  const { x1, y1, x2, y2 } = normalizeSelection(sel);
  const cx1 = Math.max(x1, floor.originX);
  const cy1 = Math.max(y1, floor.originY);
  const cx2 = Math.min(x2, floor.originX + floor.width - 1);
  const cy2 = Math.min(y2, floor.originY + floor.height - 1);
  if (cx1 > cx2 || cy1 > cy2) {
    return null;
  }
  const bounds = computeBounds(floor, {
    x1: cx1 - floor.originX,
    x2: cx2 - floor.originX,
    y1: cy1 - floor.originY,
    y2: cy2 - floor.originY,
  });
  if (!bounds) {
    return null;
  }
  const { minX, minY, maxX, maxY } = bounds;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const cells = [];
  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      cells.push(floor.cells[cy * floor.width + cx]);
    }
  }
  const hWalls: WallType[] = [];
  for (let cy = minY; cy <= maxY + 1; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      hWalls.push(floor.hWalls[hIndex(floor.width, cx, cy)]);
    }
  }
  const vWalls: WallType[] = [];
  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX + 1; cx++) {
      vWalls.push(floor.vWalls[vIndex(floor.width, cx, cy)]);
    }
  }
  return { cells, height, width, hWalls, vWalls };
}

/** World cell coordinate of the paste origin under the pointer. */
export function pasteOrigin(
  pos: { mx: number; my: number },
  cellSize: number,
  floor: FloorPlan,
): { x: number; y: number } {
  return {
    x: floor.originX + Math.floor(pos.mx / cellSize),
    y: floor.originY + Math.floor(pos.my / cellSize),
  };
}
