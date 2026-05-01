import { describe, expect, it } from "bun:test";
import { copyRegion, normalizeSelection, pasteOriginIndex } from "./clipboard-logic";
import type { Cell, FloorPlan } from "../types";

function emptyCell(): Cell {
  return { floorType: null, item: null, wall: { left: "none", top: "none" } };
}

function makeFloor(
  width: number,
  height: number,
  overrides: Partial<Record<number, Partial<Cell>>> = {},
): FloorPlan {
  const cells = Array.from({ length: width * height }, (_, i) => ({
    ...emptyCell(),
    ...overrides[i],
  }));
  return { cells, height, id: "test", name: "test", width };
}

describe("normalizeSelection", () => {
  it("already normalized → unchanged", () => {
    expect(normalizeSelection({ x1: 0, x2: 2, y1: 0, y2: 2 })).toEqual({
      x1: 0,
      x2: 2,
      y1: 0,
      y2: 2,
    });
  });

  it("inverted selection → normalizes", () => {
    expect(normalizeSelection({ x1: 3, x2: 1, y1: 4, y2: 2 })).toEqual({
      x1: 1,
      x2: 3,
      y1: 2,
      y2: 4,
    });
  });
});

describe("copyRegion", () => {
  it("copies cells within selection bounds", () => {
    const floor = makeFloor(3, 3, {
      4: { floorType: "wood" }, // Center cell (1,1)
    });
    const result = copyRegion(floor, { x1: 1, x2: 1, y1: 1, y2: 1 });
    expect(result).not.toBeNull();
    expect(result!.width).toBe(1);
    expect(result!.height).toBe(1);
    expect(result!.cells[0].floorType).toBe("wood");
  });

  it("shrinks to used cells (skips empty border)", () => {
    // 3x3 floor, only center cell (1,1) has content
    const floor = makeFloor(3, 3, {
      4: { floorType: "wood" },
    });
    // Select entire floor
    const result = copyRegion(floor, { x1: 0, x2: 2, y1: 0, y2: 2 });
    expect(result).not.toBeNull();
    expect(result!.width).toBe(1);
    expect(result!.height).toBe(1);
  });

  it("returns null when selection is entirely empty", () => {
    const floor = makeFloor(3, 3);
    const result = copyRegion(floor, { x1: 0, x2: 2, y1: 0, y2: 2 });
    expect(result).toBeNull();
  });

  it("copies multi-cell region in row-major order", () => {
    const floor = makeFloor(3, 2, {
      0: { floorType: "wood" }, // (0,0)
      1: { floorType: "water" }, // (1,0)
      3: { floorType: "tatami" }, // (0,1)
      4: { floorType: "wood" }, // (1,1)
    });
    const result = copyRegion(floor, { x1: 0, x2: 1, y1: 0, y2: 1 });
    expect(result!.cells.map((c) => c.floorType)).toEqual(["wood", "water", "tatami", "wood"]);
  });
});

describe("pasteOriginIndex", () => {
  it("converts canvas position to cell index", () => {
    const floor = makeFloor(5, 5);
    // CellSize=40, mx=85,my=45 → cx=2,cy=1 → index=1*5+2=7
    expect(pasteOriginIndex({ mx: 85, my: 45 }, 40, floor)).toBe(7);
  });

  it("clamps to floor bounds", () => {
    const floor = makeFloor(3, 3);
    // Mx=500 → cx=12 → clamped to 2
    expect(pasteOriginIndex({ mx: 500, my: 0 }, 40, floor)).toBe(2);
  });
});
