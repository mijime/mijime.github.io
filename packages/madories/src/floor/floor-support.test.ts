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
  it("flags no cells when the upper deck sits within the lower walled area", () => {
    // 1F: a 6x6 solid-walled room; 2F: floor only inside it (max ~2 cells from a wall).
    const lower = setWallsPure(
      floor(12, 12),
      [
        { kind: "h", x: 3, y: 3 },
        { kind: "h", x: 4, y: 3 },
        { kind: "h", x: 5, y: 3 },
        { kind: "h", x: 6, y: 3 },
        { kind: "h", x: 7, y: 3 },
        { kind: "h", x: 8, y: 3 },
        { kind: "h", x: 3, y: 9 },
        { kind: "h", x: 4, y: 9 },
        { kind: "h", x: 5, y: 9 },
        { kind: "h", x: 6, y: 9 },
        { kind: "h", x: 7, y: 9 },
        { kind: "h", x: 8, y: 9 },
        { kind: "v", x: 3, y: 3 },
        { kind: "v", x: 3, y: 4 },
        { kind: "v", x: 3, y: 5 },
        { kind: "v", x: 3, y: 6 },
        { kind: "v", x: 3, y: 7 },
        { kind: "v", x: 3, y: 8 },
        { kind: "v", x: 9, y: 3 },
        { kind: "v", x: 9, y: 4 },
        { kind: "v", x: 9, y: 5 },
        { kind: "v", x: 9, y: 6 },
        { kind: "v", x: 9, y: 7 },
        { kind: "v", x: 9, y: 8 },
      ],
      "solid",
    );
    // 2F deck only the 6x6 interior (x4-8, y4-8): all cells within ~2 cells of a wall.
    const upper = paint(floor(12, 12), 4, 4, 8, 8);
    const [sup] = computeFloorSupport([lower, upper]);
    expect(sup).toBeTruthy();
    expect(sup!.overCount).toBe(0);
  });

  it("flags 2F deck that extends far from the single 1F support", () => {
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
    // Cells far from x=1 have a long span; flag them via the span map.
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
