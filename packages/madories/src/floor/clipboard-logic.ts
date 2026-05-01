import { computeBounds } from "../draw/export";
import type { CopiedRegion, FloorPlan } from "../types";

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
  return { cells, height, width };
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
