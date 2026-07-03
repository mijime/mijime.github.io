import { describe, expect, it } from "vitest";
import type { Cell, FloorPlan } from "../types";
import { dslToFloor, floorToDsl } from "./dsl";
import { createFloorPlan } from "../store";
import { getWall, createHWalls, createVWalls, setWallsPure } from "./walls";

function makeFloor(width: number, height: number, override?: (cells: Cell[]) => void): FloorPlan {
  const cells: Cell[] = Array.from({ length: width * height }, () => ({
    floorType: null,
    item: null,
  }));
  override?.(cells);
  return {
    cells,
    height,
    id: "test",
    name: "Test",
    width,
    hWalls: createHWalls(width, height),
    vWalls: createVWalls(width, height),
  };
}

describe("floorToDsl", () => {
  it("empty floor outputs only size and name", () => {
    const dsl = floorToDsl(makeFloor(3, 3));
    expect(dsl).toBe('size 3 3\nname "Test"');
  });

  it("wall run-length: consecutive top walls merge into range", () => {
    let floor = makeFloor(4, 2);
    floor = setWallsPure(
      floor,
      [
        { kind: "h", x: 0, y: 0 },
        { kind: "h", x: 1, y: 0 },
        { kind: "h", x: 2, y: 0 },
      ],
      "solid",
    );
    const dsl = floorToDsl(floor);
    expect(dsl).toContain("wall (0,0)-(2,0) top solid");
    expect(dsl).not.toContain("wall (0,0) top solid\nwall (1,0) top solid");
  });

  it("wall run-length: single wall outputs single coord", () => {
    let floor = makeFloor(3, 3);
    floor = setWallsPure(floor, [{ kind: "v", x: 1, y: 1 }], "window_full");
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
    let original = createFloorPlan("test", 5, 4);
    original = setWallsPure(original, [{ kind: "h", x: 0, y: 0 }], "solid");
    original = setWallsPure(original, [{ kind: "h", x: 1, y: 0 }], "solid");
    original = setWallsPure(original, [{ kind: "v", x: 1, y: 1 }], "window_center");
    original = setWallsPure(original, [{ kind: "h", x: 0, y: 1 }], "solid");

    const cells = [...original.cells];
    cells[6].floorType = "wood";
    cells[7].floorType = "wood";
    cells[11].floorType = "wood";
    cells[12].floorType = "wood";
    cells[3].item = { rotation: 180, type: "desk" };
    original = { ...original, cells };

    const dsl = floorToDsl(original);
    const restored = dslToFloor(dsl);
    expect(restored.width).toBe(original.width);
    expect(restored.height).toBe(original.height);
    for (let i = 0; i < original.cells.length; i++) {
      expect(restored.cells[i].floorType).toBe(original.cells[i].floorType);
      expect(restored.cells[i].item).toEqual(original.cells[i].item);
    }
    // Check walls using getWall
    for (const edge of [
      { kind: "h" as const, x: 0, y: 0 },
      { kind: "h" as const, x: 1, y: 0 },
      { kind: "v" as const, x: 1, y: 1 },
      { kind: "h" as const, x: 0, y: 1 },
    ]) {
      expect(getWall(restored, edge)).toBe(getWall(original, edge));
    }
  });

  it("round-trips right/bottom boundary walls", () => {
    let floor = createFloorPlan("t", 4, 4);
    floor = setWallsPure(floor, [{ kind: "v", x: 4, y: 2 }], "solid");
    floor = setWallsPure(floor, [{ kind: "h", x: 1, y: 4 }], "window_full");
    const text = floorToDsl(floor);
    expect(text).toContain("right");
    expect(text).toContain("bottom");
    const back = dslToFloor(text);
    expect(getWall(back, { kind: "v", x: 4, y: 2 })).toBe("solid");
    expect(getWall(back, { kind: "h", x: 1, y: 4 })).toBe("window_full");
  });

  it("applies place with rotate 90 to pattern walls", () => {
    const text = [
      "size 6 6",
      'name "t"',
      "pattern p",
      "  floor (0,0)-(1,0) wood",
      "  wall (0,0)-(1,0) top solid",
      "end",
      "place p at (1,1) rotate 90",
    ].join("\n");
    const floor = dslToFloor(text);
    // pattern bbox maxY=0; CW90: top wall h(0,0)-(1,0) → v edges at local x=1,y=0..1 → global v(2,1),(2,2)
    expect(getWall(floor, { kind: "v", x: 2, y: 1 })).toBe("solid");
    expect(getWall(floor, { kind: "v", x: 2, y: 2 })).toBe("solid");
  });
});
