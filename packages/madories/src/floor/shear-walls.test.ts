import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { MM_PER_CELL } from "../units";
import {
  detectLoadPathBreaks,
  detectShearWallRuns,
  detectStackedColumns,
  SHEAR_STABLE_MIN_CELLS,
} from "./shear-walls";
import { setWallsPure } from "./walls";

function floor(w: number, h: number) {
  return createFloorPlan("t", w, h);
}

describe("detectShearWallRuns", () => {
  it("finds a contiguous horizontal run and computes its geometry", () => {
    let f = floor(5, 5);
    f = setWallsPure(
      f,
      [
        { kind: "h", x: 1, y: 1 },
        { kind: "h", x: 2, y: 1 },
        { kind: "h", x: 3, y: 1 },
      ],
      "solid",
    );
    const runs = detectShearWallRuns(f);
    expect(runs).toHaveLength(1);
    const run = runs[0];
    expect(run).toMatchObject({
      cells: 3,
      endVertex: [4, 1],
      kind: "h",
      startVertex: [1, 1],
      stable: true,
      x: 1,
      y: 1,
    });
    expect(run.length).toBe(3 * MM_PER_CELL);
  });

  it("treats a window edge as a break and splits the run", () => {
    let f = floor(5, 5);
    f = setWallsPure(f, [{ kind: "h", x: 1, y: 1 }], "solid");
    f = setWallsPure(f, [{ kind: "h", x: 2, y: 1 }], "window_full");
    f = setWallsPure(f, [{ kind: "h", x: 3, y: 1 }], "window_center");
    const runs = detectShearWallRuns(f);
    // Window edges are not structural: only x=1 survives
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ cells: 1, x: 1, y: 1, stable: false });
  });

  it("a non-wall (none) edge breaks a horizontal run", () => {
    let f = floor(5, 5);
    f = setWallsPure(f, [{ kind: "h", x: 0, y: 0 }], "solid");
    f = setWallsPure(f, [{ kind: "h", x: 2, y: 0 }], "solid"); // Gap at x=1
    const runs = detectShearWallRuns(f);
    expect(runs).toHaveLength(2);
    expect(runs.every((r) => r.cells === 1)).toBe(true);
  });

  it("single-cell runs are marginal (stable=false) at 910mm", () => {
    let f = floor(4, 4);
    f = setWallsPure(f, [{ kind: "h", x: 0, y: 0 }], "solid");
    const runs = detectShearWallRuns(f);
    expect(runs).toHaveLength(1);
    expect(runs[0].stable).toBe(false);
    expect(runs[0].length).toBe(MM_PER_CELL);
  });

  it("solid_thin is an opening (door placement) and breaks the run", () => {
    let f = floor(5, 5);
    f = setWallsPure(f, [{ kind: "h", x: 0, y: 0 }], "solid");
    f = setWallsPure(f, [{ kind: "h", x: 1, y: 0 }], "solid_thin");
    f = setWallsPure(f, [{ kind: "h", x: 2, y: 0 }], "solid");
    const runs = detectShearWallRuns(f);
    expect(runs).toHaveLength(2);
    expect(runs.map((r) => r.x)).toEqual([0, 2]);
  });

  it("detects vertical runs along a column", () => {
    let f = floor(4, 4);
    f = setWallsPure(
      f,
      [
        { kind: "v", x: 2, y: 0 },
        { kind: "v", x: 2, y: 1 },
        { kind: "v", x: 2, y: 2 },
      ],
      "solid",
    );
    const runs = detectShearWallRuns(f);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      cells: 3,
      endVertex: [2, 3],
      kind: "v",
      stable: true,
      startVertex: [2, 0],
      x: 2,
      y: 0,
    });
    expect(runs[0].cells).toBeGreaterThanOrEqual(SHEAR_STABLE_MIN_CELLS);
  });

  it("merges a T-junction as separate horizontal and vertical runs", () => {
    let f = floor(4, 4);
    f = setWallsPure(
      f,
      [
        { kind: "h", x: 0, y: 1 },
        { kind: "h", x: 1, y: 1 },
        { kind: "h", x: 2, y: 1 },
        { kind: "v", x: 2, y: 0 },
        { kind: "v", x: 2, y: 1 },
      ],
      "solid",
    );
    const runs = detectShearWallRuns(f);
    expect(runs).toHaveLength(2);
    expect(runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "h", cells: 3 }),
        expect.objectContaining({ kind: "v", cells: 2 }),
      ]),
    );
  });
});

describe("detectStackedColumns", () => {
  it("reports vertices where shear walls terminate on >=2 floors", () => {
    const make = (y: number) => {
      let f = floor(4, 4);
      f = setWallsPure(
        f,
        [
          { kind: "h", x: 0, y },
          { kind: "h", x: 1, y },
          { kind: "h", x: 2, y },
        ],
        "solid",
      );
      return f;
    };
    const f1 = make(2);
    const f2 = make(2);
    const stacked = detectStackedColumns([f1, f2]);
    expect(stacked).toHaveLength(2);
    // Left (0,2) and right (3,2) endpoints overlap; sorted by y then x
    expect(stacked[0]).toEqual({ floors: 2, x: 0, y: 2 });
    expect(stacked[1]).toEqual({ floors: 2, x: 3, y: 2 });
  });

  it("ignores vertices present on only one floor", () => {
    let f1 = floor(4, 4);
    f1 = setWallsPure(f1, [{ kind: "h", x: 0, y: 0 }], "solid");
    const f2 = floor(4, 4); // Empty
    const stacked = detectStackedColumns([f1, f2]);
    expect(stacked).toHaveLength(0);
  });

  it("counts three-way overlaps", () => {
    const make = () => {
      let f = floor(3, 3);
      f = setWallsPure(f, [{ kind: "h", x: 0, y: 0 }], "solid");
      return f;
    };
    const stacked = detectStackedColumns([make(), make(), make()]);
    expect(stacked).toHaveLength(2);
    expect(stacked[0]).toEqual({ floors: 3, x: 0, y: 0 });
    expect(stacked[1]).toEqual({ floors: 3, x: 1, y: 0 });
  });

  it("counts a shared L-corner vertex once per floor (not per run)", () => {
    const make = () => {
      // Horizontal run ending at (2,1) and a single-cell vertical run ending at
      // The SAME vertex (2,1): they share a corner column. The corner must be
      // Counted once per floor, not once per run.
      let f = floor(4, 4);
      f = setWallsPure(
        f,
        [
          { kind: "h", x: 0, y: 1 },
          { kind: "h", x: 1, y: 1 },
          { kind: "v", x: 2, y: 0 },
        ],
        "solid",
      );
      return f;
    };
    const stacked = detectStackedColumns([make(), make()]);
    // Endpoints per floor: h-run left end (0,1), shared corner (2,1),
    // V-run top (2,0) — the corner is shared but counted once.
    expect(stacked).toHaveLength(3);
    expect(stacked.find((c) => c.x === 2 && c.y === 1)).toEqual({ floors: 2, x: 2, y: 1 });
  });
});

describe("detectLoadPathBreaks", () => {
  it("flags an upper-floor run endpoint with no structural support on the floor below", () => {
    const f1 = floor(4, 4); // Ground floor, horizontal wall at y=2
    const a1 = setWallsPure(
      f1,
      [
        { kind: "h", x: 0, y: 2 },
        { kind: "h", x: 1, y: 2 },
        { kind: "h", x: 2, y: 2 },
      ],
      "solid",
    );
    const f2 = floor(4, 4); // Upper floor, horizontal wall at y=0
    const a2 = setWallsPure(
      f2,
      [
        { kind: "h", x: 0, y: 0 },
        { kind: "h", x: 1, y: 0 },
        { kind: "h", x: 2, y: 0 },
      ],
      "solid",
    );
    // Ground floor (f1) itself is never checked; only f2's endpoints need support from f1.
    const breaks = detectLoadPathBreaks([a1, a2]);
    expect(breaks).toEqual(
      expect.arrayContaining([
        { floorIndex: 1, x: 0, y: 0 },
        { floorIndex: 1, x: 3, y: 0 },
      ]),
    );
    expect(breaks).toHaveLength(2);
  });

  it("reports no breaks when the upper wall stacks exactly over the lower wall", () => {
    const make = () => {
      let f = floor(4, 4);
      f = setWallsPure(
        f,
        [
          { kind: "h", x: 0, y: 1 },
          { kind: "h", x: 1, y: 1 },
          { kind: "h", x: 2, y: 1 },
        ],
        "solid",
      );
      return f;
    };
    expect(detectLoadPathBreaks([make(), make()])).toEqual([]);
  });

  it("flags only the endpoint with no match when the rest stack", () => {
    const f1 = floor(5, 5); // Lower: wall y=1, x in [0,3) -> endpoints (0,1) & (3,1)
    const a1 = setWallsPure(
      f1,
      [
        { kind: "h", x: 0, y: 1 },
        { kind: "h", x: 1, y: 1 },
        { kind: "h", x: 2, y: 1 },
      ],
      "solid",
    );
    const f2 = floor(5, 5); // Upper: wall y=1, x in [0,4) -> endpoints (0,1) & (4,1)
    const a2 = setWallsPure(
      f2,
      [
        { kind: "h", x: 0, y: 1 },
        { kind: "h", x: 1, y: 1 },
        { kind: "h", x: 2, y: 1 },
        { kind: "h", x: 3, y: 1 },
      ],
      "solid",
    );
    const breaks = detectLoadPathBreaks([a1, a2]);
    expect(breaks).toEqual([{ floorIndex: 1, x: 4, y: 1 }]);
  });

  it("returns nothing for a single floor or an empty building", () => {
    expect(detectLoadPathBreaks([floor(4, 4)])).toEqual([]);
    expect(detectLoadPathBreaks([])).toEqual([]);
  });
});
