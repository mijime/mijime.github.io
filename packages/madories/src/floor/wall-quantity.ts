import type { EdgeRef, FloorPlan, WallType } from "../types";
import { MM_PER_CELL } from "../units";
import { computeWallBounds, type QuadrantName } from "./quadrant-balance";
import { detectShearWallRuns } from "./shear-walls";
import { hIndex, vIndex } from "./walls";

const CELL_M2 = (MM_PER_CELL / 1000) ** 2;
// Simplified shear-wall requirement: metres of structural wall per m² of floor.
// Real 壁量計算 depends on region/story/materials — this is a rough decision aid.
const NEED_PER_M2 = 0.45;

export interface WallQuantity {
  areaM2: number;
  needM: number;
  haveHm: number;
  haveVm: number;
  okH: boolean;
  okV: boolean;
}

/** Provided vs required shear wall length, per direction, for a floor. */
export function computeWallQuantity(floor: FloorPlan): WallQuantity {
  const b = computeWallBounds(floor);
  if (!b) {
    return { areaM2: 0, haveHm: 0, haveVm: 0, needM: 0, okH: true, okV: true };
  }
  const areaM2 = (b.maxX - b.minX) * (b.maxY - b.minY) * CELL_M2;
  const needM = areaM2 * NEED_PER_M2;
  let haveHm = 0;
  let haveVm = 0;
  for (const run of detectShearWallRuns(floor)) {
    if (run.kind === "h") {
      haveHm += run.length / 1000;
    } else {
      haveVm += run.length / 1000;
    }
  }
  return { areaM2, haveHm, haveVm, needM, okH: haveHm >= needM, okV: haveVm >= needM };
}

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
  const west = quadrant === "NW" || quadrant === "SW";
  const north = quadrant === "NW" || quadrant === "NE";
  const x1 = west ? bounds.minX : bounds.midX;
  const x2 = west ? bounds.midX : bounds.maxX;
  const y1 = north ? bounds.minY : bounds.midY;
  const y2 = north ? bounds.midY : bounds.maxY;

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
