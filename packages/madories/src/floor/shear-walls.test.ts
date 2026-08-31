import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { MM_PER_CELL } from "../units";
import { detectShearWallRuns, detectStackedColumns, SHEAR_STABLE_MIN_CELLS } from "./shear-walls";
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
});
