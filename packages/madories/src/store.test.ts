import { describe, expect, it } from "vitest";
import { createBuilding, createFloorPlan, reducer } from "./store";
import { setWallsPure } from "./floor/walls";
import { arrayIndex } from "./floor/frame";
import type { EdgeRef, FloorPlan } from "./types";

const count = (f: FloorPlan) => [...f.hWalls, ...f.vWalls].filter((w) => w !== "none").length;

function cellAt(f: FloorPlan, x: number, y: number) {
  const idx = arrayIndex(f, x, y);
  if (idx === null) {
    throw new Error(`cell (${x},${y}) is outside the window`);
  }
  return f.cells[idx];
}

function wallAt(f: FloorPlan, e: EdgeRef) {
  const x = e.x - f.originX;
  const y = e.y - f.originY;
  return e.kind === "h" ? f.hWalls[y * f.width + x] : f.vWalls[y * (f.width + 1) + x];
}

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
    expect(wallAt(next.floors[0], { kind: "h", x: 1, y: 0 })).toBe("solid");
    expect(wallAt(next.floors[0], { kind: "v", x: 20, y: 5 })).toBe("solid");
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
      floorId,
      floorType: "wood",
      type: "SET_FLOOR_TYPE",
      x: 5,
      y: 0,
    });
    expect(cellAt(next.floors[0], 5, 0).floorType).toBe("wood");
    expect(cellAt(next.floors[0], 4, 0).floorType).toBeNull();
  });

  it("placeItem sets item on cell", () => {
    const building = createBuilding();
    const floorId = building.floors[0].id;
    const next = reducer(building, {
      floorId,
      item: { rotation: 0, type: "chair" },
      type: "PLACE_ITEM",
      x: 3,
      y: 0,
    });
    expect(cellAt(next.floors[0], 3, 0).item?.type).toBe("chair");
  });

  it("removeItem clears item", () => {
    const building = createBuilding();
    const floorId = building.floors[0].id;
    const s1 = reducer(building, {
      floorId,
      item: { rotation: 0, type: "chair" },
      type: "PLACE_ITEM",
      x: 3,
      y: 0,
    });
    const s2 = reducer(s1, { floorId, type: "REMOVE_ITEM", x: 3, y: 0 });
    expect(cellAt(s2.floors[0], 3, 0).item).toBeNull();
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
      floorId: floor.id,
      roomName: "LDK",
      type: "SET_ROOM_NAME",
      x: 1,
      y: 1,
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
      floorId: floor.id,
      roomName: "トイレ",
      type: "SET_ROOM_NAME",
      x: 1,
      y: 1,
    });
    const cleared = reducer(named, {
      floorId: floor.id,
      roomName: null,
      type: "SET_ROOM_NAME",
      x: 1,
      y: 1,
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
      { floorId: floor.id, roomName: "LDK", type: "SET_ROOM_NAME", x: 1, y: 1 },
    );
    const edited = reducer(named, {
      floorId: floor.id,
      type: "ERASE_CELL",
      x: 1,
      y: 1,
    });
    expect(edited.floors[0].cells[1 * 6 + 1].roomName).toBeUndefined();
  });

  it("keeps the name when walls change without moving the top-left anchor", () => {
    // 8-cell room: x=1..4, y=1..2
    const floor = encloseRect(createFloorPlan("test", 6, 6), 1, 1, 4, 2);
    const named = reducer(
      { cellSize: 32, floors: [floor] },
      { floorId: floor.id, roomName: "LDK", type: "SET_ROOM_NAME", x: 1, y: 1 },
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
    expect(cellAt(edited.floors[0], 1, 1).roomName).toBe("LDK");
  });

  it("leaves other rooms' names intact when one room is edited", () => {
    const floor8 = createFloorPlan("test", 8, 6);
    const twoRooms = encloseRect(encloseRect(floor8, 1, 1, 2, 2), 4, 1, 5, 2);
    const building = { cellSize: 32, floors: [twoRooms] };
    const namedA = reducer(building, {
      floorId: twoRooms.id,
      roomName: "LDK",
      type: "SET_ROOM_NAME",
      x: 1,
      y: 1,
    });
    const namedB = reducer(namedA, {
      floorId: twoRooms.id,
      roomName: "トイレ",
      type: "SET_ROOM_NAME",
      x: 4,
      y: 1,
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
        expect(cellAt(edited.floors[0], x, y).roomName).toBeUndefined();
      }
    }
    // B's top-left anchor keeps its name; other B cells are unnamed.
    expect(cellAt(edited.floors[0], 4, 1).roomName).toBe("トイレ");
  });
});
