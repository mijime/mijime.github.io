import { describe, expect, it } from "vitest";
import { createBuilding, createFloorPlan, reducer } from "./store";
import { getWall } from "./floor/walls";

describe("createFloorPlan", () => {
  it("creates correct cell count", () => {
    const fp = createFloorPlan("1F", 4, 3);
    expect(fp.cells.length).toBe(12);
  });

  it("all cells start with null floorType and null item", () => {
    const fp = createFloorPlan("1F", 2, 2);
    for (const cell of fp.cells) {
      expect(cell.floorType).toBeNull();
      expect(cell.item).toBeNull();
    }
  });
});

describe("createBuilding", () => {
  it("creates building with one floor", () => {
    const b = createBuilding();
    expect(b.floors.length).toBe(1);
    expect(b.floors[0].name).toBe("1F");
    expect(b.cellSize).toBe(32);
  });
});

describe("SET_WALLS", () => {
  it("sets multiple edges in one action", () => {
    const b = createBuilding();
    const floorId = b.floors[0].id;
    const next = reducer(b, {
      edges: [
        { kind: "h", x: 0, y: 0 },
        { kind: "h", x: 1, y: 0 },
        { kind: "v", x: 20, y: 5 },
      ],
      floorId,
      type: "SET_WALLS",
      wallType: "solid",
    });
    expect(getWall(next.floors[0], { kind: "h", x: 1, y: 0 })).toBe("solid");
    expect(getWall(next.floors[0], { kind: "v", x: 20, y: 5 })).toBe("solid");
  });
});

describe("ROTATE_FLOOR", () => {
  it("keeps wall count across rotation", () => {
    const b = createBuilding();
    const floorId = b.floors[0].id;
    const withWalls = reducer(b, {
      edges: [
        { kind: "h", x: 3, y: 0 },
        { kind: "v", x: 0, y: 3 },
      ],
      floorId,
      type: "SET_WALLS",
      wallType: "solid",
    });
    const rotated = reducer(withWalls, { floorId, type: "ROTATE_FLOOR" });
    const count = (f: (typeof rotated.floors)[0]) =>
      [...f.hWalls, ...f.vWalls].filter((w) => w !== "none").length;
    expect(count(rotated.floors[0])).toBe(2);
  });
});

describe("reducer", () => {
  it("setFloorType updates single cell", () => {
    const building = createBuilding();
    const floorId = building.floors[0].id;
    const next = reducer(building, {
      cellIndex: 5,
      floorId,
      floorType: "wood",
      type: "SET_FLOOR_TYPE",
    });
    expect(next.floors[0].cells[5].floorType).toBe("wood");
    expect(next.floors[0].cells[0].floorType).toBeNull();
  });

  it("placeItem sets item on cell", () => {
    const building = createBuilding();
    const floorId = building.floors[0].id;
    const next = reducer(building, {
      cellIndex: 3,
      floorId,
      item: { rotation: 0, type: "chair" },
      type: "PLACE_ITEM",
    });
    expect(next.floors[0].cells[3].item?.type).toBe("chair");
  });

  it("removeItem clears item", () => {
    const building = createBuilding();
    const floorId = building.floors[0].id;
    const s1 = reducer(building, {
      cellIndex: 3,
      floorId,
      item: { rotation: 0, type: "chair" },
      type: "PLACE_ITEM",
    });
    const s2 = reducer(s1, { cellIndex: 3, floorId, type: "REMOVE_ITEM" });
    expect(s2.floors[0].cells[3].item).toBeNull();
  });

  it("addFloor appends new floor with default name", () => {
    const building = createBuilding();
    const next = reducer(building, { type: "ADD_FLOOR" });
    expect(next.floors.length).toBe(2);
    expect(next.floors[1].name).toBe("新しいレイヤー");
  });

  it("renameFloor updates floor name", () => {
    const building = createBuilding();
    const floorId = building.floors[0].id;
    const next = reducer(building, {
      floorId,
      name: "地下",
      type: "RENAME_FLOOR",
    });
    expect(next.floors[0].name).toBe("地下");
  });
});
