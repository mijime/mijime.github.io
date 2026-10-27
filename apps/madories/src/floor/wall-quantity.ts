import type { EdgeRef, FloorPlan, WallType } from "../types";
import { computeWallBounds, type QuadrantName } from "./quadrant-balance";
import { hIndex, vIndex } from "./walls";

export interface WallSuggestion {
  kind: "h" | "v";
  x: number;
  y: number;
  cells: number;
  edges: EdgeRef[];
}

/**
 * Best place to add a shear wall of the given direction inside a quadrant:
 * the line (row for "h", column for "v") whose wall slots are all currently
 * open ("none"), spanning >= 2 cells. Prefers longer runs.
 */
export function suggestWallRun(
  floor: FloorPlan,
  quadrant: QuadrantName,
  kind: "h" | "v",
): WallSuggestion | null {
  const bounds = computeWallBounds(floor);
  if (!bounds) {
    return null;
  }
  const { maxX, maxY, midX, midY, minX, minY } = bounds;

  const west = quadrant === "NW" || quadrant === "SW";
  const north = quadrant === "NW" || quadrant === "NE";
  const x1 = west ? minX : midX;
  const x2 = west ? midX : maxX;
  const y1 = north ? minY : midY;
  const y2 = north ? midY : maxY;

  let best: WallSuggestion | null = null;

  if (kind === "h") {
    for (let y = y1; y <= y2; y++) {
      const run = bestOpenRun(x1, x2, (x) => floor.hWalls[hIndex(floor.width, x, y)]);
      if (run && (!best || run.len > best.cells)) {
        best = {
          cells: run.len,
          edges: Array.from({ length: run.len }, (_, i) => ({
            kind: "h" as const,
            x: run.start + i,
            y,
          })),
          kind,
          x: run.start,
          y,
        };
      }
    }
  } else {
    for (let x = x1; x <= x2; x++) {
      const run = bestOpenRun(y1, y2, (y) => floor.vWalls[vIndex(floor.width, x, y)]);
      if (run && (!best || run.len > best.cells)) {
        best = {
          cells: run.len,
          edges: Array.from({ length: run.len }, (_, i) => ({
            kind: "v" as const,
            x,
            y: run.start + i,
          })),
          kind,
          x,
          y: run.start,
        };
      }
    }
  }

  if (!best || best.cells < 2) {
    return null;
  }
  return best;
}

/** Longest contiguous segment where `at(i)` is "none", within [from, to). */
function bestOpenRun(
  from: number,
  to: number,
  at: (i: number) => WallType,
): { len: number; start: number } | null {
  let bestLen = 0;
  let bestStart = -1;
  let start = -1;
  let len = 0;
  for (let i = from; i < to; i++) {
    if (at(i) === "none") {
      if (len === 0) {
        start = i;
      }
      len++;
      if (len > bestLen) {
        bestLen = len;
        bestStart = start;
      }
    } else {
      len = 0;
    }
  }
  if (bestLen === 0) {
    return null;
  }
  return { len: bestLen, start: bestStart };
}
