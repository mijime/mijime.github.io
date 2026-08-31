import { describe, expect, it } from "vitest";
import { createBuilding, createFloorPlan, reducer } from "./store";
import { getWall, setWallsPure } from "./floor/walls";
import type { EdgeRef, FloorPlan } from "./types";

const count = (f: FloorPlan) => [...f.hWalls, ...f.vWalls].filter((w) => w !== "none").length;

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

// Helper: enclose the inclusive rectangle (x1,y1)-(x2,y2) with solid walls.
function encloseRect(floor: FloorPlan, x1: number, y1: number, x2: number, y2: number): FloorPlan {
  const edges: EdgeRef[] = [];
  for (let x = x1; x <= x2; x++) {
    edges.push({ kind: "h", x, y: y1 }, { kind: "h", x, y: y2 + 1 });
  }
  for (let y = y1; y <= y2; y++) {
    edges.push({ kind: "v", x: x1, y }, { kind: "v", x: x2 + 1, y });
  }
  return setWallsPure(floor, edges, "solid");
}

// Helper: a building with cells (1,1)-(2,2) enclosed as a 4-cell room.
function enclosedBuilding() {
  const floor = encloseRect(createFloorPlan("test", 6, 6), 1, 1, 2, 2);
  return { building: { cellSize: 32, floors: [floor] }, floor };
}

describe("SET_ROOM_NAME", () => {
  it("stores the name on the room's top-left cell only", () => {
    const { building, floor } = enclosedBuilding();
    const next = reducer(building, {
      cellIndex: 1 * 6 + 1,
      floorId: floor.id,
      roomName: "LDK",
      type: "SET_ROOM_NAME",
    });
    const tl = 1 * 6 + 1; // Top-left cell (1,1) of the room
    expect(next.floors[0].cells[tl].roomName).toBe("LDK");
    for (const idx of [1 * 6 + 2, 2 * 6 + 1, 2 * 6 + 2]) {
      expect(next.floors[0].cells[idx].roomName).toBeUndefined();
    }
  });

  it("SET_ROOM_NAME with null clears the name", () => {
    const { building, floor } = enclosedBuilding();
    const named = reducer(building, {
      cellIndex: 1 * 6 + 1,
      floorId: floor.id,
      roomName: "トイレ",
      type: "SET_ROOM_NAME",
    });
    const cleared = reducer(named, {
      cellIndex: 1 * 6 + 1,
      floorId: floor.id,
      roomName: null,
      type: "SET_ROOM_NAME",
    });
    for (const cell of cleared.floors[0].cells) {
      expect(cell.roomName).toBeUndefined();
    }
  });

  it("deletes the name when its anchor cell is erased", () => {
    // 8-cell room: x=1..4, y=1..2
    const floor = encloseRect(createFloorPlan("test", 6, 6), 1, 1, 4, 2);
    const named = reducer(
      { cellSize: 32, floors: [floor] },
      { cellIndex: 1 * 6 + 1, floorId: floor.id, roomName: "LDK", type: "SET_ROOM_NAME" },
    );
    const edited = reducer(named, {
      cellIndex: 1 * 6 + 1,
      floorId: floor.id,
      type: "ERASE_CELL",
    });
    expect(edited.floors[0].cells[1 * 6 + 1].roomName).toBeUndefined();
  });

  it("keeps the name when walls change without moving the top-left anchor", () => {
    // 8-cell room: x=1..4, y=1..2
    const floor = encloseRect(createFloorPlan("test", 6, 6), 1, 1, 4, 2);
    const named = reducer(
      { cellSize: 32, floors: [floor] },
      { cellIndex: 1 * 6 + 1, floorId: floor.id, roomName: "LDK", type: "SET_ROOM_NAME" },
    );
    // Redraw the bottom wall — the room's top-left (1,1) is unaffected.
    const edited = reducer(named, {
      edges: [
        { kind: "h", x: 1, y: 3 },
        { kind: "h", x: 2, y: 3 },
        { kind: "h", x: 3, y: 3 },
        { kind: "h", x: 4, y: 3 },
      ],
      floorId: floor.id,
      type: "SET_WALLS",
      wallType: "solid",
    });
    expect(edited.floors[0].cells[1 * 6 + 1].roomName).toBe("LDK");
  });

  it("leaves other rooms' names intact when one room is edited", () => {
    const floor8 = createFloorPlan("test", 8, 6);
    const twoRooms = encloseRect(encloseRect(floor8, 1, 1, 2, 2), 4, 1, 5, 2);
    const building = { cellSize: 32, floors: [twoRooms] };
    const a = 1 * 8 + 1; // Room A top-left (1,1)
    const b = 1 * 8 + 4; // Room B top-left (4,1)
    const namedA = reducer(building, {
      cellIndex: a,
      floorId: twoRooms.id,
      roomName: "LDK",
      type: "SET_ROOM_NAME",
    });
    const namedB = reducer(namedA, {
      cellIndex: b,
      floorId: twoRooms.id,
      roomName: "トイレ",
      type: "SET_ROOM_NAME",
    });
    // Draw an internal wall inside room A only.
    const edited = reducer(namedB, {
      edges: [
        { kind: "v", x: 2, y: 1 },
        { kind: "v", x: 2, y: 2 },
      ],
      floorId: twoRooms.id,
      type: "SET_WALLS",
      wallType: "solid",
    });
    for (let y = 1; y <= 2; y++) {
      for (let x = 1; x <= 2; x++) {
        expect(edited.floors[0].cells[y * 8 + x].roomName).toBeUndefined();
      }
    }
    // B's top-left anchor keeps its name; other B cells are unnamed.
    expect(edited.floors[0].cells[b].roomName).toBe("トイレ");
  });
});
