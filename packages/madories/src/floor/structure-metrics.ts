import type { FloorPlan } from "../types";
import { detectShearWallRuns, isStructuralWall } from "./shear-walls";
import { computeWallBounds } from "./quadrant-balance";
import { hIndex, vIndex } from "./walls";

// Sounding set of per-floor structural-indicators used by the 耐震壁 diagnostic.
// These are rough decision aids — the definitive analysis is a 構造計算 (建築士).
// All coordinates here are in CELL units (1 cell = 0.91m), per-cell mass assumed
// Uniform; measure vs. hand-check strictly separated (tool output).

export interface BalanceMetrics {
  /** Horizontal structural wall length (mm) */
  h: number;
  /** Vertical structural wall length (mm) */
  v: number;
  /** Min(h,v)/max(h,v) in [0,1]; 0 = a direction missing */
  ratio: number;
  ok: boolean;
}

/**
 * 方向別バランス係数: how even the horizontal vs vertical shear walls are on a
 * floor. Practical rule of thumb stays within roughly 2× — a ratio below 0.5
 * flags wildly uneven bracing in one direction.
 */
export function computeBalanceRatio(floor: FloorPlan): BalanceMetrics {
  let h = 0;
  let v = 0;
  for (const run of detectShearWallRuns(floor)) {
    if (run.kind === "h") {
      h += run.length;
    } else {
      v += run.length;
    }
  }
  const max = Math.max(h, v);
  const ratio = max > 0 ? Math.min(h, v) / max : 0;
  return { h, ratio, v, ok: ratio >= 0.5 };
}

export interface EccentricityMetrics {
  /** Mass centroid (mm from plan origin), driven by floor area */
  gx: number;
  gy: number;
  /** Rigidity center (mm), weighted by wall length */
  rx: number;
  ry: number;
  /** Eccentricity as a fraction of the plan span per axis */
  ex: number;
  ey: number;
  spanX: number;
  spanY: number;
  ok: boolean;
}

/**
 * 偏心率 (torsion risk): distance between the rigidity (剛心) and mass (重心)
 * centers, normalized per axis by the plan span. A rigid center far from the
 * mass center means the story wants to twist under lateral load. 0.15 per axis
 * is a common practical ceiling.
 */
export function computeEccentricity(floor: FloorPlan): EccentricityMetrics | null {
  const b = computeWallBounds(floor);
  if (!b) {
    return null;
  }
  const { minX, maxX, minY, maxY } = b;
  const { width, height } = floor;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  // Mass centroid: painted (interior) cells, uniform density.
  let massN = 0;
  let massX = 0;
  let massY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = floor.cells[y * width + x];
      if (cell.floorType === null) {
        continue;
      }
      massN++;
      massX += x + 0.5;
      massY += y + 0.5;
    }
  }
  // Fallback: any interior cell of the footprint when nothing is painted.
  if (massN === 0) {
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        massN++;
        massX += x + 0.5;
        massY += y + 0.5;
      }
    }
  }
  const gx = massN > 0 ? massX / massN : (minX + maxX) / 2;
  const gy = massN > 0 ? massY / massN : (minY + maxY) / 2;

  // Rigidity center: x-position driven by x-resisting (horizontal) walls,
  // Y-position by y-resisting (vertical) walls, weighted by wall length.
  let hLen = 0;
  let hWx = 0;
  let vLen = 0;
  let vWy = 0;
  for (const run of detectShearWallRuns(floor)) {
    if (run.kind === "h") {
      hLen += run.length;
      hWx += run.length * (run.x + run.cells / 2);
    } else {
      vLen += run.length;
      vWy += run.length * (run.y + run.cells / 2);
    }
  }
  const rx = hLen > 0 ? hWx / hLen : (minX + maxX) / 2;
  const ry = vLen > 0 ? vWy / vLen : (minY + maxY) / 2;

  const ex = Math.abs(rx - gx) / spanX;
  const ey = Math.abs(ry - gy) / spanY;
  const ok = ex < 0.15 && ey < 0.15;
  const mm = 910;
  return {
    ex,
    ey,
    gx: gx * mm,
    gy: gy * mm,
    ok,
    rx: rx * mm,
    ry: ry * mm,
    spanX: spanX * mm,
    spanY: spanY * mm,
  };
}

export interface PerimeterMetric {
  /** Structural (solid) wall length on the 4 bounding edges (mm) */
  structural: number;
  /** Total bounding perimeter length (mm) */
  total: number;
  ratio: number;
  ok: boolean;
}

/**
 * 外周壁連続性: fraction of the house's outer boundary that carries a shear
 * wall. A facade with mostly windows/openings on an edge has little continuous
 * bracing there. Below 0.5 is flagged.
 */
export function computePerimeterContinuity(floor: FloorPlan): PerimeterMetric | null {
  const b = computeWallBounds(floor);
  if (!b) {
    return null;
  }
  const { minX, maxX, minY, maxY } = b;
  const { width, hWalls, vWalls } = floor;

  let structural = 0;
  let total = 0;

  // Top & bottom bounding rows: horizontal edges at y=minY / y=maxY.
  for (const y of [minY, maxY]) {
    for (let x = minX; x < maxX; x++) {
      total++;
      if (isStructuralWall(hWalls[hIndex(width, x, y)])) {
        structural++;
      }
    }
  }
  // Left & right bounding columns: vertical edges at x=minX / x=maxX.
  for (const x of [minX, maxX]) {
    for (let y = minY; y < maxY; y++) {
      total++;
      if (isStructuralWall(vWalls[vIndex(width, x, y)])) {
        structural++;
      }
    }
  }

  const ratio = total > 0 ? structural / total : 0;
  const mm = 910;
  return { ratio, structural: structural * mm, total: total * mm, ok: ratio >= 0.5 };
}
