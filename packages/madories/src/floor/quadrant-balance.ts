import type { FloorPlan } from "../types";
import { MM_PER_CELL } from "../units";
import { hIndex, vIndex } from "./walls";
import { detectShearWallRuns } from "./shear-walls";

// 四分割法 (four-division method): split each floor plan into 4 quadrants and
// Check that every quadrant has shear wall in BOTH directions. Walls spread only
// In part of the plan leave a quadrant with no horizontal or no vertical wall,
// Which makes the plan's resistance unevenly distributed (eccentricity / torsion
// Risk). A wall crossing a divider counts toward each quadrant it spans.
//
// IMPORTANT: plans live on an N×N canvas where the house is placed at an
// Arbitrary offset, so the partition is anchored to the house's own bounding
// Box (the extent of its walls), NOT to the canvas origin.
export type QuadrantName = "NW" | "NE" | "SW" | "SE";

export interface WallBounds {
  /** Cell-col range [minX, maxX) the house occupies */
  minX: number;
  maxX: number;
  /** Cell-row range [minY, maxY) the house occupies */
  minY: number;
  maxY: number;
  /** Horizontal divider (cell column) splitting west / east */
  midX: number;
  /** Vertical divider (cell row) splitting north / south */
  midY: number;
}

export interface QuadrantBalance {
  name: QuadrantName;
  /** Horizontal shear wall length in mm inside this quadrant */
  h: number;
  /** Vertical shear wall length in mm inside this quadrant */
  v: number;
  /** Balance ratio in [0,1]: min(h,v)/max(h,v); 0 = a direction missing, 1 = perfectly even */
  ratio: number;
  /** True when BOTH directions are present in this quadrant */
  ok: boolean;
}

export interface FloorBalance {
  quadrants: QuadrantBalance[];
  bounds: WallBounds | null;
}

/** Bounding box of the house footprint, from the extent of every wall edge. */
export function computeWallBounds(floor: FloorPlan): WallBounds | null {
  const { width, height, hWalls, vWalls } = floor;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let found = false;

  // Horizontal edges: an h-edge (x,y) spans vertex (x,y)…(x+1,y).
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      if (hWalls[hIndex(width, x, y)] === "none") {
        continue;
      }
      found = true;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + 1);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  // Vertical edges: a v-edge (x,y) spans vertex (x,y)…(x,y+1).
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= width; x++) {
      if (vWalls[vIndex(width, x, y)] === "none") {
        continue;
      }
      found = true;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + 1);
    }
  }

  if (!found) {
    return null;
  }
  return {
    maxX,
    maxY,
    midX: Math.floor((minX + maxX) / 2),
    midY: Math.floor((minY + maxY) / 2),
    minX,
    minY,
  };
}

function overlap(from: number, to: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(to, hi) - Math.max(from, lo));
}

export function computeQuadrantBalance(floor: FloorPlan): FloorBalance {
  const bounds = computeWallBounds(floor);
  if (!bounds) {
    return { bounds: null, quadrants: [] };
  }
  const { midX, midY, minX, maxX, minY, maxY } = bounds;

  const acc: Record<QuadrantName, { h: number; v: number }> = {
    NE: { h: 0, v: 0 },
    NW: { h: 0, v: 0 },
    SE: { h: 0, v: 0 },
    SW: { h: 0, v: 0 },
  };

  for (const run of detectShearWallRuns(floor)) {
    if (run.kind === "h") {
      const west = overlap(run.x, run.x + run.cells, minX, midX) * MM_PER_CELL;
      const east = overlap(run.x, run.x + run.cells, midX, maxX) * MM_PER_CELL;
      if (run.y <= midY) {
        acc.NW.h += west;
        acc.NE.h += east;
      } else {
        acc.SW.h += west;
        acc.SE.h += east;
      }
    } else {
      const top = overlap(run.y, run.y + run.cells, minY, midY) * MM_PER_CELL;
      const bottom = overlap(run.y, run.y + run.cells, midY, maxY) * MM_PER_CELL;
      if (run.x <= midX) {
        acc.NW.v += top;
        acc.SW.v += bottom;
      } else {
        acc.NE.v += top;
        acc.SE.v += bottom;
      }
    }
  }

  const quadrants: QuadrantBalance[] = (["NW", "NE", "SW", "SE"] as const).map((name) => {
    const { h, v } = acc[name];
    const max = Math.max(h, v);
    const ratio = max > 0 ? Math.min(h, v) / max : 0;
    return { h, name, ok: h > 0 && v > 0, ratio, v };
  });
  return { bounds, quadrants };
}
