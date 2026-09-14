import { describe, expect, it } from "vitest";
import { arrayIndex } from "../floor/frame";
import { createFloorPlan, reducer } from "../store";
import type { FloorPlan, Item } from "../types";
import { anchorsIntersectingRect, findItemAnchor } from "./item-hit";

function place(floor: FloorPlan, x: number, y: number, item: Item): FloorPlan {
  const idx = arrayIndex(floor, x, y);
  if (idx === null) {
    throw new Error("anchor outside window");
  }
  const cells = [...floor.cells];
  cells[idx] = { ...cells[idx], item };
  return { ...floor, cells };
}

describe("findItemAnchor", () => {
  it("matches the whole visible footprint", () => {
    let floor = createFloorPlan("t", 20, 20);
    floor = place(floor, 5, 5, { rotation: 0, type: "desk" }); // 2x4
    for (const [x, y] of [
      [5, 5],
      [6, 5],
      [5, 8],
      [6, 8],
    ]) {
      expect(findItemAnchor(floor, x, y)).toEqual({
        item: { rotation: 0, type: "desk" },
        x: 5,
        y: 5,
      });
    }
    expect(findItemAnchor(floor, 4, 5)).toBeNull();
    expect(findItemAnchor(floor, 7, 5)).toBeNull();
    expect(findItemAnchor(floor, 5, 9)).toBeNull();
  });

  it("respects the rotated footprint", () => {
    let floor = createFloorPlan("t", 20, 20);
    floor = place(floor, 5, 5, { rotation: 90, type: "desk" }); // 4x2
    expect(findItemAnchor(floor, 8, 6)).not.toBeNull();
    expect(findItemAnchor(floor, 8, 7)).toBeNull();
  });
});

describe("anchorsIntersectingRect", () => {
  it("finds an anchor when the rect touches any footprint cell", () => {
    let floor = createFloorPlan("t", 20, 20);
    floor = place(floor, 5, 5, { rotation: 0, type: "desk" });
    const idx = arrayIndex(floor, 5, 5);
    expect(anchorsIntersectingRect(floor, { maxX: 6, maxY: 6, minX: 6, minY: 6 })).toEqual([idx]);
    expect(anchorsIntersectingRect(floor, { maxX: 10, maxY: 10, minX: 10, minY: 10 })).toEqual([]);
  });
});

describe("erase removes the whole item", () => {
  it("ERASE_CELL on a non-anchor footprint cell clears the item", () => {
    const building = { cellSize: 32, floors: [createFloorPlan("t", 20, 20)] };
    const floorId = building.floors[0].id;
    const placed = reducer(building, {
      floorId,
      item: { rotation: 0, type: "desk" },
      type: "PLACE_ITEM",
      x: 5,
      y: 5,
    });
    expect(findItemAnchor(placed.floors[0], 5, 5)).not.toBeNull();
    const erased = reducer(placed, { floorId, type: "ERASE_CELL", x: 6, y: 7 });
    expect(findItemAnchor(erased.floors[0], 5, 5)).toBeNull();
  });
});
