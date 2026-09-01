import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { setWallsPure } from "./walls";
import { computeFloorSupport } from "./floor-support";

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

describe("computeFloorSupport", () => {
  it("flags no cells for a small, well-supported deck", () => {
    // 1F: a 2-cell-wide slot walled on both sides; 2F deck sits inside it.
    const lower = setWallsPure(
      floor(10, 10),
      [
        { kind: "v", x: 3, y: 3 },
        { kind: "v", x: 3, y: 4 },
        { kind: "v", x: 3, y: 5 },
        { kind: "v", x: 5, y: 3 },
        { kind: "v", x: 5, y: 4 },
        { kind: "v", x: 5, y: 5 },
      ],
      "solid",
    );
    const upper = paint(floor(10, 10), 4, 4, 5, 6);
    const [sup] = computeFloorSupport([lower, upper]);
    expect(sup).toBeTruthy();
    expect(sup!.overCount).toBe(0);
  });

  it("flags a wide deck spanning far past a single 1F support", () => {
    // 1F: only a thin vertical wall at x=1.
    const lower = setWallsPure(
      floor(12, 12),
      [
        { kind: "v", x: 1, y: 2 },
        { kind: "v", x: 1, y: 3 },
        { kind: "v", x: 1, y: 4 },
      ],
      "solid",
    );
    // 2F: a wide deck strip at y=5, spanning far away from x=1.
    const upper = paint(floor(12, 12), 1, 5, 10, 6);
    const [sup] = computeFloorSupport([lower, upper]);
    expect(sup).toBeTruthy();
    expect(sup!.overCount).toBeGreaterThan(0);
    // Cells far from x=1 have a long clear span; flag them via the span map.
    let farX: { x: number; spanM: number } | undefined;
    if (sup) {
      farX = undefined;
      for (const c of sup.cells) {
        if (c.x === 8) {
          farX = c;
          break;
        }
      }
    }
    expect(farX).toBeTruthy();
    const spanM = farX!.spanM;
    expect(spanM).toBeGreaterThan(3.6);
  });

  it("returns nothing for a single floor", () => {
    const single = computeFloorSupport([paint(floor(6, 6), 1, 1, 5, 5)]);
    expect(single).toEqual([]);
  });
});
