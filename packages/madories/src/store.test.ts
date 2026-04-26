import { describe, expect, it } from "bun:test";
import { createBuilding, createFloorPlan, reducer } from "./store";

describe("createFloorPlan", () => {
  it("creates correct cell count", () => {
    const fp = createFloorPlan("1F", 4, 3);
    expect(fp.cells.length).toBe(12);
  });

  it("all cells start with no walls and null floorType", () => {
    const fp = createFloorPlan("1F", 2, 2);
    for (const cell of fp.cells) {
      expect(cell.wall.top).toBe("none");
      expect(cell.wall.left).toBe("none");
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

describe("reducer", () => {
  it("setWall sets wall type directly", () => {
    const building = createBuilding();
    const floorId = building.floors[0].id;
    const next = reducer(building, {
      cellIndex: 0,
      edge: "top",
      floorId,
      type: "SET_WALL",
      wallType: "solid",
    });
    expect(next.floors[0].cells[0].wall.top).toBe("solid");
  });

  it("setWall can set window directly", () => {
    const building = createBuilding();
    const floorId = building.floors[0].id;
    const next = reducer(building, {
      cellIndex: 0,
      edge: "top",
      floorId,
      type: "SET_WALL",
      wallType: "window_full",
    });
    expect(next.floors[0].cells[0].wall.top).toBe("window_full");
  });

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
