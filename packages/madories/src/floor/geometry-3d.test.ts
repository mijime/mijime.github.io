import { describe, expect, it } from "bun:test";
import { generateFloorTiles, generateWallSegments } from "./geometry-3d";
import type { FloorPlan } from "../types";

function makeFloor(width: number, height: number, overrides?: Partial<FloorPlan>): FloorPlan {
  return {
    cells: Array.from({ length: width * height }, () => ({
      floorType: null,
      item: null,
      wall: { left: "none", top: "none" },
    })),
    height,
    id: "test",
    name: "test",
    width,
    ...overrides,
  };
}

describe("generateFloorTiles", () => {
  it("returns empty array for empty floor", () => {
    const floor = makeFloor(2, 2);
    expect(generateFloorTiles(floor)).toEqual([]);
  });

  it("returns only cells with floorType set", () => {
    const floor = makeFloor(2, 2, {
      cells: [
        { floorType: "wood", item: null, wall: { left: "none", top: "none" } },
        { floorType: null, item: null, wall: { left: "none", top: "none" } },
        { floorType: "water", item: null, wall: { left: "none", top: "none" } },
        { floorType: null, item: null, wall: { left: "none", top: "none" } },
      ],
    });
    expect(generateFloorTiles(floor)).toEqual([
      { cx: 0, cy: 0, floorType: "wood" },
      { cx: 0, cy: 1, floorType: "water" },
    ]);
  });
});

describe("generateWallSegments", () => {
  it("returns empty array when no walls", () => {
    const floor = makeFloor(2, 2);
    expect(generateWallSegments(floor)).toEqual([]);
  });

  it("extracts top and left walls correctly", () => {
    const floor = makeFloor(2, 2, {
      cells: [
        { floorType: null, item: null, wall: { left: "solid", top: "none" } },
        { floorType: null, item: null, wall: { left: "none", top: "solid" } },
        { floorType: null, item: null, wall: { left: "none", top: "none" } },
        { floorType: null, item: null, wall: { left: "none", top: "none" } },
      ],
    });
    expect(generateWallSegments(floor)).toEqual([
      { cx: 0, cy: 0, edge: "left", wallType: "solid" },
      { cx: 1, cy: 0, edge: "top", wallType: "solid" },
    ]);
  });
});
