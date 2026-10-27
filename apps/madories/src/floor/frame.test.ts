import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import {
  contentArrayRect,
  contentBounds,
  ensureWorldBounds,
  FRAME_PAD,
  normalizeToContent,
  windowFloor,
} from "./frame";
import { rotateFloorCW90, setWallsPure } from "./walls";
import type { FloorPlan } from "../types";

function setFloorType(floor: FloorPlan, x: number, y: number): FloorPlan {
  const ax = x - floor.originX;
  const ay = y - floor.originY;
  const idx = ay * floor.width + ax;
  const cells = [...floor.cells];
  cells[idx] = { ...cells[idx], floorType: "wood" };
  return { ...floor, cells };
}

describe("contentBounds", () => {
  it("returns null for an empty floor", () => {
    expect(contentBounds(createFloorPlan("t", 10, 10))).toBeNull();
  });

  it("covers floor cells and both sides of a wall edge", () => {
    let floor = createFloorPlan("t", 10, 10);
    floor = setWallsPure(floor, [{ kind: "h", x: 4, y: 4 }], "solid");
    floor = setFloorType(floor, 6, 2);
    expect(contentBounds(floor)).toEqual({ maxX: 6, maxY: 4, minX: 4, minY: 2 });
  });

  it("does not create a phantom row for a top-boundary wall", () => {
    let floor = createFloorPlan("t", 6, 6);
    floor = setWallsPure(floor, [{ kind: "h", x: 1, y: 0 }], "solid");
    expect(contentBounds(floor)).toEqual({ maxX: 1, maxY: 0, minX: 1, minY: 0 });
  });
});

describe("ensureWorldBounds", () => {
  it("frames a far target tightly on an empty floor", () => {
    const floor = createFloorPlan("t", 40, 40);
    const next = ensureWorldBounds(floor, { maxX: 1000, maxY: 1000, minX: 1000, minY: 1000 });
    expect(next.width).toBe(1 + FRAME_PAD * 2);
    expect(next.height).toBe(1 + FRAME_PAD * 2);
    expect(next.originX).toBe(1000 - FRAME_PAD);
    expect(next.originY).toBe(1000 - FRAME_PAD);
  });

  it("keeps existing content when growing", () => {
    let floor = createFloorPlan("t", 40, 40);
    floor = setFloorType(floor, 0, 0);
    const next = ensureWorldBounds(floor, { maxX: 50, maxY: 0, minX: 50, minY: 0 });
    expect(next.originX).toBe(0);
    expect(next.originX + next.width - 1).toBe(50 + FRAME_PAD);
    // Existing content survives the window rebuild.
    expect(next.cells[(0 - next.originY) * next.width + (0 - next.originX)].floorType).toBe("wood");
  });
});

describe("normalizeToContent", () => {
  it("pads content on all four sides and moves the origin", () => {
    let floor = createFloorPlan("t", 20, 20);
    floor = setFloorType(floor, 5, 5);
    floor = setFloorType(floor, 7, 8);
    const next = normalizeToContent(floor);
    expect(next.originX).toBe(5 - FRAME_PAD);
    expect(next.originY).toBe(5 - FRAME_PAD);
    expect(next.width).toBe(3 + FRAME_PAD * 2);
    expect(next.height).toBe(4 + FRAME_PAD * 2);
    // Content is preserved at its world coordinates.
    expect(next.cells[(5 - next.originY) * next.width + (5 - next.originX)].floorType).toBe("wood");
    expect(next.cells[(8 - next.originY) * next.width + (7 - next.originX)].floorType).toBe("wood");
  });

  it("is a no-op for an empty floor", () => {
    const floor = createFloorPlan("t", 20, 20);
    expect(normalizeToContent(floor)).toBe(floor);
  });
});

describe("windowFloor", () => {
  it("re-indexes content to the new origin without losing it", () => {
    let floor = createFloorPlan("t", 10, 10);
    floor = setFloorType(floor, 3, 3);
    const shifted = windowFloor(floor, 1, 1, 8, 8);
    expect(shifted.originX).toBe(1);
    expect(shifted.cells[2 * 8 + 2].floorType).toBe("wood");
  });
});

describe("rotation centering", () => {
  it("keeps content centered after rotate + normalize", () => {
    let floor = createFloorPlan("t", 20, 20);
    for (let y = 5; y <= 8; y++) {
      for (let x = 5; x <= 7; x++) {
        floor = setFloorType(floor, x, y);
      }
    }
    const canonical = normalizeToContent(floor);
    const rotated = normalizeToContent(rotateFloorCW90(canonical));
    const rect = contentArrayRect(rotated) as { x1: number; x2: number; y1: number; y2: number };
    expect(rect.x1).toBe(FRAME_PAD);
    expect(rect.y1).toBe(FRAME_PAD);
    expect(rotated.width - (rect.x2 + 1)).toBe(FRAME_PAD);
    expect(rotated.height - (rect.y2 + 1)).toBe(FRAME_PAD);
  });
});
