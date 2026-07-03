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

export function copyRegion(
  floor: FloorPlan,
  sel: { x1: number; y1: number; x2: number; y2: number },
): CopiedRegion | null {
  const { x1, y1, x2, y2 } = normalizeSelection(sel);
  const bounds = computeBounds(floor, { x1, x2, y1, y2 });
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

export function pasteOriginIndex(
  pos: { mx: number; my: number },
  cellSize: number,
  floor: FloorPlan,
): number {
  const cx = Math.min(Math.floor(pos.mx / cellSize), floor.width - 1);
  const cy = Math.min(Math.floor(pos.my / cellSize), floor.height - 1);
  return cy * floor.width + cx;
}
