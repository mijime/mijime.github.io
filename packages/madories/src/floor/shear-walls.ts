import type { FloorPlan, WallType } from "../types";
import { MM_PER_CELL } from "../units";
import { hIndex, vIndex } from "./walls";

// A wall carries lateral (seismic) load only if it is `solid`. Window edges
// (`window_full` / `window_center`) and `solid_thin` are openings — the former
// Are glass, the latter is the wall segment where a door is placed — and they
// Break the run: a shear wall interrupted by any opening does not count.
export const STRUCTURAL_WALL_TYPES: ReadonlySet<WallType> = new Set(["solid"]);

// One cell = 0.91m. A practical shear panel wants ~≥1m, so a 2-cell (1.82m)
// Run is treated as stable; a single 0.91m run is marked marginal (it can
// Still brace, but is hard to count as primary shear resistance).
export const SHEAR_STABLE_MIN_CELLS = 2;

export function isStructuralWall(type: WallType): boolean {
  return STRUCTURAL_WALL_TYPES.has(type);
}

export interface ShearWallRun {
  kind: "h" | "v";
  /** Edge start in cell units: an "h" run spans (x,y)→(x+cells,y), a "v" run (x,y)→(x,y+cells) */
  x: number;
  y: number;
  /** Number of contiguous cells (edges) in the run */
  cells: number;
  /** Physical length in mm (= cells * 910) */
  length: number;
  /** True when cells >= 2 (stable shear wall), false = 0.91m marginal run */
  stable: boolean;
  /** Endpoint vertices, in (width+1)x(height+1) vertex space */
  startVertex: [number, number];
  endVertex: [number, number];
}

/**
 * Detect maximal straight runs of structural wall edges.
 * Horizontal runs scan each hWalls row; vertical runs scan each vWalls column.
 */
export function detectShearWallRuns(floor: FloorPlan): ShearWallRun[] {
  const { width, height, hWalls, vWalls } = floor;
  const runs: ShearWallRun[] = [];

  const push = (
    kind: "h" | "v",
    x: number,
    y: number,
    cells: number,
    startVertex: [number, number],
    endVertex: [number, number],
  ) => {
    runs.push({
      cells,
      endVertex,
      kind,
      length: cells * MM_PER_CELL,
      stable: cells >= SHEAR_STABLE_MIN_CELLS,
      startVertex,
      x,
      y,
    });
  };

  // Horizontal runs: an h-edge (x,y) spans vertex (x,y)→(x+1,y).
  for (let y = 0; y <= height; y++) {
    let x = 0;
    while (x < width) {
      if (!isStructuralWall(hWalls[hIndex(width, x, y)])) {
        x++;
        continue;
      }
      const x0 = x;
      while (x + 1 < width && isStructuralWall(hWalls[hIndex(width, x + 1, y)])) {
        x++;
      }
      push("h", x0, y, x - x0 + 1, [x0, y], [x + 1, y]);
      x++;
    }
  }

  // Vertical runs: a v-edge (x,y) spans vertex (x,y)→(x,y+1).
  for (let x = 0; x <= width; x++) {
    let y = 0;
    while (y < height) {
      if (!isStructuralWall(vWalls[vIndex(width, x, y)])) {
        y++;
        continue;
      }
      const y0 = y;
      while (y + 1 < height && isStructuralWall(vWalls[vIndex(width, x, y + 1)])) {
        y++;
      }
      push("v", x, y0, y - y0 + 1, [x, y0], [x, y + 1]);
      y++;
    }
  }

  return runs;
}

export interface StackedColumn {
  x: number;
  y: number;
  /** Number of floors whose shear walls terminate at this vertex */
  floors: number;
}

/**
 * 通し柱 positions: vertices where a shear wall run terminates on >= 2 floors
 * at the same coordinate, so the load path runs floor to floor. Floors may
 * differ in size; coordinates are raw vertex coords in each floor's own space.
 */
export function detectStackedColumns(floors: FloorPlan[]): StackedColumn[] {
  const counts = new Map<string, { x: number; y: number; count: number }>();
  for (const floor of floors) {
    const seen = new Set<string>();
    for (const run of detectShearWallRuns(floor)) {
      for (const [vx, vy] of [run.startVertex, run.endVertex]) {
        const key = `${vx},${vy}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        const entry = counts.get(key) ?? { count: 0, x: vx, y: vy };
        entry.count += 1;
        counts.set(key, entry);
      }
    }
  }
  const stacked: StackedColumn[] = [];
  for (const { count, x, y } of counts.values()) {
    if (count >= 2) {
      stacked.push({ floors: count, x, y });
    }
  }
  stacked.sort((a, b) => a.y - b.y || a.x - b.x);
  return stacked;
}

export interface LoadPathBreak {
  /** Vertex (in grid vertex space) where the load path is interrupted */
  x: number;
  y: number;
  /**
   * Index of the UPPER floor whose wall-run endpoint lacks a structural
   * support on the floor directly below it (floors must be ordered bottom-up,
   * index 0 = ground floor, which is never checked).
   */
  floorIndex: number;
}

/** All grid vertices where a structural wall run terminates on this floor. */
function runEndpointVertices(floor: FloorPlan): Set<string> {
  const set = new Set<string>();
  for (const run of detectShearWallRuns(floor)) {
    for (const [vx, vy] of [run.startVertex, run.endVertex]) {
      set.add(`${vx},${vy}`);
    }
  }
  return set;
}

/**
 * 荷重経路途切れ: the inverse of 通し柱. A run endpoint on an upper floor must
 * transfer its lateral load down through a structural member at the same
 * vertex on the floor below. When the endpoint has no matching structural run
 * endpoint immediately below, the load path is interrupted.
 *
 * `floors` must be ordered bottom-up (index 0 = ground floor). The ground floor
 * rests on the foundation, which is not modeled, so it is never flagged.
 */
export function detectLoadPathBreaks(floors: FloorPlan[]): LoadPathBreak[] {
  if (floors.length < 2) {
    return [];
  }
  const breaks: LoadPathBreak[] = [];
  for (let i = 1; i < floors.length; i++) {
    const below = runEndpointVertices(floors[i - 1]);
    for (const run of detectShearWallRuns(floors[i])) {
      for (const [vx, vy] of [run.startVertex, run.endVertex]) {
        if (below.has(`${vx},${vy}`)) {
          continue;
        }
        breaks.push({ floorIndex: i, x: vx, y: vy });
      }
    }
  }
  breaks.sort((a, b) => a.floorIndex - b.floorIndex || a.y - b.y || a.x - b.x);
  return breaks;
}
