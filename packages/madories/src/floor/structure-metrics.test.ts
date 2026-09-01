import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { setWallsPure } from "./walls";
import {
  computeBalanceRatio,
  computeEccentricity,
  computePerimeterContinuity,
} from "./structure-metrics";

function floor(w: number, h: number) {
  return createFloorPlan("t", w, h);
}

function paint(f: ReturnType<typeof floor>, x1: number, y1: number, x2: number, y2: number) {
  const cells = [...f.cells];
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      cells[y * f.width + x] = { ...cells[y * f.width + x], floorType: "wood" };
    }
  }
  return { ...f, cells };
}

describe("computeBalanceRatio", () => {
  it("reports even horizontal/vertical walls as balanced", () => {
    let f = paint(floor(5, 5), 1, 1, 4, 4);
    f = setWallsPure(
      f,
      [
        { kind: "h", x: 1, y: 2 },
        { kind: "h", x: 2, y: 2 },
        { kind: "v", x: 2, y: 1 },
        { kind: "v", x: 2, y: 2 },
      ],
      "solid",
    );
    const b = computeBalanceRatio(f);
    expect(b.ratio).toBe(1);
    expect(b.ok).toBe(true);
  });

  it("flags a floor with only one direction", () => {
    let f = paint(floor(5, 5), 1, 1, 4, 4);
    f = setWallsPure(
      f,
      [
        { kind: "h", x: 1, y: 2 },
        { kind: "h", x: 2, y: 2 },
      ],
      "solid",
    );
    const b = computeBalanceRatio(f);
    expect(b.ratio).toBe(0);
    expect(b.ok).toBe(false);
  });
});

describe("computeEccentricity", () => {
  it("keeps a near-symmetric plan OK", () => {
    // 4x4 painted block x[2,6),y[2,6) — mass ~ (4,4) — walled on all 4 sides.
    let f = paint(floor(8, 8), 2, 2, 6, 6);
    f = setWallsPure(
      f,
      [
        // Top (y=2) and bottom (y=6) rows
        { kind: "h", x: 2, y: 2 },
        { kind: "h", x: 3, y: 2 },
        { kind: "h", x: 4, y: 2 },
        { kind: "h", x: 5, y: 2 },
        { kind: "h", x: 2, y: 6 },
        { kind: "h", x: 3, y: 6 },
        { kind: "h", x: 4, y: 6 },
        { kind: "h", x: 5, y: 6 },
        // Left (x=2) and right (x=6) columns
        { kind: "v", x: 2, y: 2 },
        { kind: "v", x: 2, y: 3 },
        { kind: "v", x: 2, y: 4 },
        { kind: "v", x: 2, y: 5 },
        { kind: "v", x: 6, y: 2 },
        { kind: "v", x: 6, y: 3 },
        { kind: "v", x: 6, y: 4 },
        { kind: "v", x: 6, y: 5 },
      ],
      "solid",
    );
    const e = computeEccentricity(f)!;
    expect(e.ok).toBe(true);
    expect(e.ex).toBeLessThan(0.15);
    expect(e.ey).toBeLessThan(0.15);
  });

  it("flags a plan with wall stiffness clustered to one side (torsion risk)", () => {
    // Painted block at mass ~(4,4). Horizontal bracing is only a 2-cell run at
    // The far right (x=5) -> rigidity pulled off-centre -> NG.
    let f = paint(floor(8, 8), 2, 2, 6, 6);
    f = setWallsPure(
      f,
      [
        { kind: "h", x: 4, y: 2 },
        { kind: "h", x: 5, y: 2 },
        { kind: "v", x: 2, y: 2 },
        { kind: "v", x: 2, y: 3 },
        { kind: "v", x: 2, y: 4 },
      ],
      "solid",
    );
    const e = computeEccentricity(f)!;
    expect(e.ex).toBeGreaterThan(0.15);
    expect(e.ok).toBe(false);
  });
});

describe("computePerimeterContinuity", () => {
  it("counts a fully walled perimeter as continuous", () => {
    let f = paint(floor(8, 8), 2, 2, 6, 6);
    f = setWallsPure(
      f,
      [
        // Top and bottom rows (y=2 and y=5), x in [2,6)
        { kind: "h", x: 2, y: 2 },
        { kind: "h", x: 3, y: 2 },
        { kind: "h", x: 4, y: 2 },
        { kind: "h", x: 2, y: 5 },
        { kind: "h", x: 3, y: 5 },
        { kind: "h", x: 4, y: 5 },
        // Left and right columns (x=2 and x=5), y in [2,6)
        { kind: "v", x: 2, y: 2 },
        { kind: "v", x: 2, y: 3 },
        { kind: "v", x: 2, y: 4 },
        { kind: "v", x: 5, y: 2 },
        { kind: "v", x: 5, y: 3 },
        { kind: "v", x: 5, y: 4 },
      ],
      "solid",
    );
    const p = computePerimeterContinuity(f);
    expect(p?.ratio).toBe(1);
    expect(p?.ok).toBe(true);
  });

  it("flags a perimeter with three open sides", () => {
    let f = paint(floor(8, 8), 2, 2, 6, 6);
    // Only the right column is a shear wall; top, bottom, left are openings.
    f = setWallsPure(
      f,
      [
        { kind: "h", x: 2, y: 2 },
        { kind: "h", x: 3, y: 2 },
        { kind: "h", x: 4, y: 2 },
      ],
      "window_full",
    );
    f = setWallsPure(
      f,
      [
        { kind: "v", x: 5, y: 2 },
        { kind: "v", x: 5, y: 3 },
        { kind: "v", x: 5, y: 4 },
      ],
      "solid",
    );
    const p = computePerimeterContinuity(f)!;
    // 3 structural edges (right side) / 12 perimeter edges
    expect(p.ratio).toBeCloseTo(0.25, 5);
    expect(p.ok).toBe(false);
  });
});
