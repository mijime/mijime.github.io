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
 * 柱 (frame columns): every grid vertex where a structural wall run terminates.
 * This is the explicit column model — walls need a column at each end, so in
 * grid terms the run endpoints ARE the column locations (L/T junctions show up
 * here because the joining run terminates at the crossing).
 */
export function detectStructuralColumnVertices(floor: FloorPlan): Array<[number, number]> {
  const map = new Map<string, [number, number]>();
  for (const run of detectShearWallRuns(floor)) {
    map.set(`${run.startVertex[0]},${run.startVertex[1]}`, run.startVertex);
    map.set(`${run.endVertex[0]},${run.endVertex[1]}`, run.endVertex);
  }
  const cols = [...map.values()];
  cols.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return cols;
}

/**
 * 通し柱 positions: columns (run-endpoint vertices) that appear on >= 2 floors
 * at the same coordinate, so the vertical load path runs floor to floor.
 */
export function detectStackedColumns(floors: FloorPlan[]): StackedColumn[] {
  const counts = new Map<string, { x: number; y: number; count: number }>();
  for (const floor of floors) {
    for (const [vx, vy] of detectStructuralColumnVertices(floor)) {
      const key = `${vx},${vy}`;
      const entry = counts.get(key) ?? { count: 0, x: vx, y: vy };
      entry.count += 1;
      counts.set(key, entry);
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
   * Index of the UPPER floor whose column (wall-run endpoint) lacks a
   * structural support on the floor directly below it (floors must be ordered
   * bottom-up, index 0 = ground floor, which is never checked).
   */
  floorIndex: number;
  /** Length (mm) of the longest wall run pressing down at this vertex — the
   * break's severity proxy (a long wall floating at its end concentrates load). */
  length: number;
}

/**
 * True when the vertex (vx,vy) is ON a structural wall, i.e. any structural
 * wall edge is incident to it — as that edge's endpoint OR mid-way along it.
 * This is the *relaxed* support rule: an upper wall's end is fine as long as
 * the floor below has a wall passing under/through that vertex (distributed
 * backing), not only a strict run-endpoint match.
 */
function vertexOnStructuralWall(floor: FloorPlan, vx: number, vy: number): boolean {
  const { width, height, hWalls, vWalls } = floor;
  // Horizontal edges incident to (vx,vy): starting at (vx-1,vy) or (vx,vy).
  for (const x of [vx - 1, vx]) {
    if (
      x >= 0 &&
      x < width &&
      vy >= 0 &&
      vy <= height &&
      isStructuralWall(hWalls[hIndex(width, x, vy)])
    ) {
      return true;
    }
  }
  // Vertical edges incident: starting at (vx,vy-1) or (vx,vy).
  for (const y of [vy - 1, vy]) {
    if (
      vx >= 0 &&
      vx <= width &&
      y >= 0 &&
      y < height &&
      isStructuralWall(vWalls[vIndex(width, vx, y)])
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 荷重経路途切れ: the inverse of 通し柱. A column (wall-run endpoint) on an upper
 * floor must transfer its lateral load down through a wall on the floor below.
 * Using the relaxed support rule, a 2F end that lands over the middle of a 1F
 * wall is supported; only a truly floating end (no structural wall anywhere
 * under that vertex) is flagged.
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
    const below = floors[i - 1];
    // Map vertex -> longest structural run pressing down there, for vertices
    // With no support below. Dedupes shared/corner vertices while carrying the
    // Worst contributing run's length as the severity proxy.
    const worse = new Map<string, { x: number; y: number; length: number }>();
    for (const run of detectShearWallRuns(floors[i])) {
      for (const [vx, vy] of [run.startVertex, run.endVertex]) {
        if (vertexOnStructuralWall(below, vx, vy)) {
          continue;
        }
        const key = `${vx},${vy}`;
        const prev = worse.get(key);
        const length = prev ? Math.max(prev.length, run.length) : run.length;
        worse.set(key, { length, x: vx, y: vy });
      }
    }
    for (const { length, x, y } of worse.values()) {
      breaks.push({ floorIndex: i, length, x, y });
    }
  }
  breaks.sort((a, b) => a.floorIndex - b.floorIndex || a.y - b.y || a.x - b.x);
  return breaks;
}
