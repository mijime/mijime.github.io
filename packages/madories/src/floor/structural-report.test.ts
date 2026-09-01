import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { computeStructuralReport } from "./structural-report";
import { setWallsPure } from "./walls";

function walledRoom(w: number, h: number) {
  let f = createFloorPlan("t", w, h);
  f = setWallsPure(
    f,
    [
      { kind: "h", x: 1, y: 1 },
      { kind: "h", x: 2, y: 1 },
      { kind: "h", x: 1, y: 5 },
      { kind: "h", x: 2, y: 5 },
      { kind: "v", x: 1, y: 1 },
      { kind: "v", x: 1, y: 2 },
      { kind: "v", x: 1, y: 3 },
      { kind: "v", x: 1, y: 4 },
      { kind: "v", x: 3, y: 1 },
      { kind: "v", x: 3, y: 2 },
      { kind: "v", x: 3, y: 3 },
      { kind: "v", x: 3, y: 4 },
    ],
    "solid",
  );
  return f;
}

describe("computeStructuralReport", () => {
  it("bundles all indicators for a floor", () => {
    const f1 = walledRoom(6, 6);
    const r = computeStructuralReport(f1, [f1]);
    expect(r.floorIndex).toBe(0);
    expect(r.wallQuantity.areaM2).toBeGreaterThan(0);
    expect(r.quadrant.quadrants.length).toBe(4);
    expect(r.balanceRatio.ok).toBe(true);
    expect(r.interFloor).toBeUndefined(); // Only floor
    expect(r.support).toBeUndefined(); // Ground floor
    expect(r.breaksHere).toEqual([]);
  });

  it("attributes the upper floor's support info correctly", () => {
    const f1 = walledRoom(6, 6);
    const f2 = walledRoom(6, 6);
    // Paint a deck on the 2F inside the walls so floor-support has cells.
    const cells = f2.cells.map((c) => ({ ...c }));
    for (let y = 2; y < 5; y++) {
      for (let x = 2; x < 3; x++) {
        cells[y * f2.width + x] = { ...cells[y * f2.width + x], floorType: "wood" };
      }
    }
    const f2p = { ...f2, cells };
    const r2 = computeStructuralReport(f2p, [f1, f2p]);
    expect(r2.floorIndex).toBe(1);
    expect(r2.support).toBeTruthy(); // 2F has a deck supported by 1F
  });
});
