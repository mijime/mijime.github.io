import { describe, expect, it } from "bun:test";
import { dedupFloorItems } from "./dedup-items";
import type { FloorPlan } from "../../types";

function makeFloor(w: number, h: number, cells: FloorPlan["cells"]): FloorPlan {
  return { id: "test", width: w, height: h, cells, name: "" };
}

describe("dedupFloorItems", () => {
  it("renders each single-tile item once", () => {
    const floor = makeFloor(2, 1, [
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "chair", rotation: 0 },
      },
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "toilet", rotation: 0 },
      },
    ]);
    const result = dedupFloorItems(floor);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 0, y: 0, item: { type: "chair", rotation: 0 } });
    expect(result[1]).toEqual({ x: 1, y: 0, item: { type: "toilet", rotation: 0 } });
  });

  it("deduplicates a 1x2 item at rotation 0", () => {
    const floor = makeFloor(2, 2, [
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "sofa", rotation: 0 },
      },
      { floorType: "wood", wall: { top: "solid", left: "solid" }, item: null },
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "sofa", rotation: 0 },
      },
      { floorType: "wood", wall: { top: "solid", left: "solid" }, item: null },
    ]);
    const result = dedupFloorItems(floor);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ x: 0, y: 0, item: { type: "sofa", rotation: 0 } });
  });

  it("deduplicates a 1x2 item at rotation 90", () => {
    const floor = makeFloor(2, 2, [
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "sofa", rotation: 90 },
      },
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "sofa", rotation: 90 },
      },
      { floorType: "wood", wall: { top: "solid", left: "solid" }, item: null },
      { floorType: "wood", wall: { top: "solid", left: "solid" }, item: null },
    ]);
    const result = dedupFloorItems(floor);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ x: 0, y: 0, item: { type: "sofa", rotation: 90 } });
  });

  it("handles multiple multi-tile items", () => {
    const floor = makeFloor(2, 4, [
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "tv", rotation: 0 },
      },
      { floorType: "wood", wall: { top: "solid", left: "solid" }, item: null },
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "tv", rotation: 0 },
      },
      { floorType: "wood", wall: { top: "solid", left: "solid" }, item: null },
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "stairs", rotation: 0 },
      },
      { floorType: "wood", wall: { top: "solid", left: "solid" }, item: null },
      {
        floorType: "wood",
        wall: { top: "solid", left: "solid" },
        item: { type: "stairs", rotation: 0 },
      },
      { floorType: "wood", wall: { top: "solid", left: "solid" }, item: null },
    ]);
    const result = dedupFloorItems(floor);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 0, y: 0, item: { type: "tv", rotation: 0 } });
    expect(result[1]).toEqual({ x: 0, y: 2, item: { type: "stairs", rotation: 0 } });
  });
});
