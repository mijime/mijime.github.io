import { describe, expect, it } from "bun:test";
import type { Cell, FloorPlan } from "../types";
import { dslToFloor, floorToDsl } from "./dsl";

function makeFloor(width: number, height: number, override?: (cells: Cell[]) => void): FloorPlan {
  const cells: Cell[] = Array.from({ length: width * height }, () => ({
    floorType: null,
    item: null,
    wall: { left: "none", top: "none" },
  }));
  override?.(cells);
  return { cells, height, id: "test", name: "Test", width };
}

describe("floorToDsl", () => {
  it("empty floor outputs only size and name", () => {
    const dsl = floorToDsl(makeFloor(3, 3));
    expect(dsl).toBe('size 3 3\nname "Test"');
  });

  it("wall run-length: consecutive top walls merge into range", () => {
    const floor = makeFloor(4, 2, (cells) => {
      cells[0].wall.top = "solid";
      cells[1].wall.top = "solid";
      cells[2].wall.top = "solid";
    });
    const dsl = floorToDsl(floor);
    expect(dsl).toContain("wall (0,0)-(2,0) top solid");
    expect(dsl).not.toContain("wall (0,0) top solid\nwall (1,0) top solid");
  });

  it("wall run-length: single wall outputs single coord", () => {
    const floor = makeFloor(3, 3, (cells) => {
      cells[4].wall.left = "window_full";
    });
    const dsl = floorToDsl(floor);
    expect(dsl).toContain("wall (1,1) left window_full");
  });

  it("floor rect packing: uniform type region merges to single rect", () => {
    const floor = makeFloor(4, 3, (cells) => {
      for (let i = 0; i < 12; i++) {
        cells[i].floorType = "wood";
      }
    });
    const dsl = floorToDsl(floor);
    expect(dsl).toContain("floor (0,0)-(3,2) wood");
    const floorLines = dsl.split("\n").filter((l) => l.startsWith("floor"));
    expect(floorLines).toHaveLength(1);
  });

  it("floor rect packing: two separate type regions", () => {
    const floor = makeFloor(4, 2, (cells) => {
      cells[0].floorType = "wood";
      cells[1].floorType = "wood";
      cells[4].floorType = "water";
      cells[5].floorType = "water";
    });
    const dsl = floorToDsl(floor);
    expect(dsl).toContain("floor (0,0)-(1,0) wood");
    expect(dsl).toContain("floor (0,1)-(1,1) water");
  });

  it("item outputs with rotation only when non-zero", () => {
    const floor = makeFloor(3, 3, (cells) => {
      cells[0].item = { rotation: 0, type: "desk" };
      cells[1].item = { rotation: 90, type: "chair" };
    });
    const dsl = floorToDsl(floor);
    expect(dsl).toContain("item (0,0) desk");
    expect(dsl).not.toContain("item (0,0) desk 0");
    expect(dsl).toContain("item (1,0) chair 90");
  });
});

describe("round-trip", () => {
  it("dslToFloor(floorToDsl(floor)) reproduces cells", () => {
    const original = makeFloor(5, 4, (cells) => {
      cells[0].wall.top = "solid";
      cells[1].wall.top = "solid";
      cells[5].wall.left = "window_center";
      cells[6].floorType = "wood";
      cells[7].floorType = "wood";
      cells[11].floorType = "wood";
      cells[12].floorType = "wood";
      cells[3].item = { rotation: 180, type: "desk" };
    });
    const dsl = floorToDsl(original);
    const restored = dslToFloor(dsl);
    expect(restored.width).toBe(original.width);
    expect(restored.height).toBe(original.height);
    for (let i = 0; i < original.cells.length; i++) {
      expect(restored.cells[i].wall).toEqual(original.cells[i].wall);
      expect(restored.cells[i].floorType).toBe(original.cells[i].floorType);
      expect(restored.cells[i].item).toEqual(original.cells[i].item);
    }
  });
});
