import { v4 as uuidv4 } from "uuid";
import { createHWalls, createVWalls, flipFloorH, flipFloorV, rotateFloorCW90 } from "./floor/walls";
import { arrayIndex, ensureWorldBounds, normalizeToContent, type WorldRect } from "./floor/frame";
import { detectRooms, roomTopLeftCell } from "./floor/room-detection";
import { anchorsIntersectingRect } from "./input/item-hit";
import { getItemFootprint, ITEM_DEF_MAP } from "./items";
import type {
  Building,
  Cell,
  CopiedRegion,
  EdgeRef,
  FloorPlan,
  FloorType,
  Item,
  WallType,
} from "./types";

function createCell(): Cell {
  return { floorType: null, item: null };
}

export function createFloorPlan(name: string, width = 40, height = 40): FloorPlan {
  return {
    cells: Array.from({ length: width * height }, createCell),
    hWalls: createHWalls(width, height),
    height,
    id: uuidv4(),
    name,
    originX: 0,
    originY: 0,
    vWalls: createVWalls(width, height),
    width,
  };
}

export function createBuilding(): Building {
  return {
    cellSize: 32,
    floors: [createFloorPlan("1F")],
  };
}

type Action =
  | {
      type: "SET_WALLS";
      floorId: string;
      edges: EdgeRef[];
      wallType: WallType;
    }
  | {
      type: "SET_FLOOR_TYPE";
      floorId: string;
      x: number;
      y: number;
      floorType: FloorType | null;
    }
  | { type: "PLACE_ITEM"; floorId: string; x: number; y: number; item: Item }
  | { type: "REMOVE_ITEM"; floorId: string; x: number; y: number }
  | { type: "ROTATE_ITEM"; floorId: string; x: number; y: number }
  | {
      type: "MOVE_ITEM";
      floorId: string;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
    }
  | { type: "ADD_FLOOR" }
  | { type: "IMPORT_FLOOR"; floor: FloorPlan }
  | { type: "REPLACE_FLOOR"; floorId: string; floor: FloorPlan }
  | { type: "RENAME_FLOOR"; floorId: string; name: string }
  | { type: "CLEAR_FLOOR"; floorId: string }
  | { type: "REMOVE_FLOOR"; floorId: string }
  | { type: "NORMALIZE_FLOOR"; floorId: string }
  | {
      type: "PASTE_REGION";
      floorId: string;
      x: number;
      y: number;
      region: CopiedRegion;
    }
  | {
      type: "ERASE_REGION";
      floorId: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | { type: "ERASE_CELL"; floorId: string; x: number; y: number }
  | { type: "FILL_ROOM"; floorId: string; x: number; y: number; floorType: FloorType }
  | { type: "SET_ROOM_NAME"; floorId: string; x: number; y: number; roomName: string | null }
  | { type: "ROTATE_FLOOR"; floorId: string }
  | { type: "FLIP_FLOOR"; floorId: string; axis: "h" | "v" };

function updateFloor(state: Building, floorId: string, fn: (f: FloorPlan) => FloorPlan): Building {
  return {
    ...state,
    floors: state.floors.map((f) => (f.id === floorId ? fn(f) : f)),
  };
}

function itemRect(x: number, y: number, item: Item): WorldRect {
  const def = ITEM_DEF_MAP.get(item.type);
  if (!def) {
    return { maxX: x, maxY: y, minX: x, minY: y };
  }
  const { effectiveW, effectiveH } = getItemFootprint(def, item.rotation);
  return { maxX: x + effectiveW - 1, maxY: y + effectiveH - 1, minX: x, minY: y };
}

function rectOf(x1: number, y1: number, x2: number, y2: number): WorldRect {
  return {
    maxX: Math.max(x1, x2),
    maxY: Math.max(y1, y2),
    minX: Math.min(x1, x2),
    minY: Math.min(y1, y2),
  };
}

/** Grows the floor so the world rect (plus pad) fits, returning the grown floor. */
function grow(floor: FloorPlan, rect: WorldRect | null): FloorPlan {
  return rect ? ensureWorldBounds(floor, rect) : floor;
}

function setCellAt(floor: FloorPlan, x: number, y: number, fn: (cell: Cell) => Cell): FloorPlan {
  const idx = arrayIndex(floor, x, y);
  if (idx === null) {
    return floor;
  }
  return { ...floor, cells: floor.cells.map((c, i) => (i === idx ? fn(c) : c)) };
}

function edgesRect(edges: EdgeRef[]): WorldRect | null {
  if (edges.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const e of edges) {
    const ex = e.x;
    const ey = e.y;
    include(ex, ey);
    include(e.kind === "h" ? ex : ex - 1, e.kind === "h" ? ey - 1 : ey);
  }
  return { maxX, maxY, minX, minY };
}

function applyWallEdge(
  floor: FloorPlan,
  e: EdgeRef,
  type: WallType,
  hWalls: WallType[],
  vWalls: WallType[],
): boolean {
  const x = e.x - floor.originX;
  const y = e.y - floor.originY;
  if (e.kind === "h") {
    if (x < 0 || x >= floor.width || y < 0 || y > floor.height) {
      return false;
    }
    hWalls[y * floor.width + x] = type;
    return true;
  }
  if (x < 0 || x > floor.width || y < 0 || y >= floor.height) {
    return false;
  }
  vWalls[y * (floor.width + 1) + x] = type;
  return true;
}

/** Applies wall edges in world coordinates. Grows the floor first when `growToFit`. */
function setWallsWorld(
  floor: FloorPlan,
  edges: EdgeRef[],
  type: WallType,
  growToFit: boolean,
): FloorPlan {
  const next = growToFit ? grow(floor, edgesRect(edges)) : floor;
  let changed = next === floor;
  const hWalls = [...next.hWalls];
  const vWalls = [...next.vWalls];
  for (const e of edges) {
    if (applyWallEdge(next, e, type, hWalls, vWalls)) {
      changed = true;
    }
  }
  return changed ? { ...next, hWalls, vWalls } : next;
}

function cellEdges(x: number, y: number): EdgeRef[] {
  return [
    { kind: "h", x, y },
    { kind: "h", x, y: y + 1 },
    { kind: "v", x, y },
    { kind: "v", x: x + 1, y },
  ];
}

function reducerImpl(state: Building, action: Action): Building {
  switch (action.type) {
    case "SET_WALLS": {
      return updateFloor(state, action.floorId, (floor) =>
        setWallsWorld(floor, action.edges, action.wallType, true),
      );
    }

    case "SET_FLOOR_TYPE": {
      return updateFloor(state, action.floorId, (floor) => {
        const next = grow(floor, rectOf(action.x, action.y, action.x, action.y));
        return setCellAt(next, action.x, action.y, (cell) => ({
          ...cell,
          floorType: action.floorType,
        }));
      });
    }

    case "PLACE_ITEM": {
      return updateFloor(state, action.floorId, (floor) => {
        const next = grow(floor, itemRect(action.x, action.y, action.item));
        return setCellAt(next, action.x, action.y, (cell) => ({
          ...cell,
          item: action.item,
        }));
      });
    }

    case "REMOVE_ITEM": {
      return updateFloor(state, action.floorId, (floor) =>
        setCellAt(floor, action.x, action.y, (cell) => ({ ...cell, item: null })),
      );
    }

    case "ROTATE_ITEM": {
      return updateFloor(state, action.floorId, (floor) => {
        const idx = arrayIndex(floor, action.x, action.y);
        if (idx === null) {
          return floor;
        }
        const item = floor.cells[idx].item;
        if (!item) {
          return floor;
        }
        const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
        const nextRotation = rotations[(rotations.indexOf(item.rotation) + 1) % 4];
        const nextItem: Item = { ...item, rotation: nextRotation };
        const grown = grow(floor, itemRect(action.x, action.y, nextItem));
        return setCellAt(grown, action.x, action.y, (cell) => ({ ...cell, item: nextItem }));
      });
    }

    case "MOVE_ITEM": {
      return updateFloor(state, action.floorId, (floor) => {
        const fromIdx = arrayIndex(floor, action.fromX, action.fromY);
        if (fromIdx === null) {
          return floor;
        }
        const item = floor.cells[fromIdx].item;
        if (!item) {
          return floor;
        }
        const next = grow(floor, rectOf(action.toX, action.toY, action.fromX, action.fromY));
        const moved = setCellAt(next, action.fromX, action.fromY, (cell) => ({
          ...cell,
          item: null,
        }));
        return setCellAt(moved, action.toX, action.toY, (cell) => ({ ...cell, item }));
      });
    }

    case "CLEAR_FLOOR": {
      return updateFloor(state, action.floorId, (floor) => ({
        ...floor,
        cells: Array.from({ length: floor.width * floor.height }, createCell),
        hWalls: createHWalls(floor.width, floor.height),
        vWalls: createVWalls(floor.width, floor.height),
      }));
    }

    case "REMOVE_FLOOR": {
      if (state.floors.length <= 1) {
        return state;
      }
      return {
        ...state,
        floors: state.floors.filter((f) => f.id !== action.floorId),
      };
    }

    case "ADD_FLOOR": {
      return {
        ...state,
        floors: [...state.floors, createFloorPlan("新しいレイヤー")],
      };
    }

    case "IMPORT_FLOOR": {
      return { ...state, floors: [...state.floors, action.floor] };
    }

    case "REPLACE_FLOOR": {
      return updateFloor(state, action.floorId, () => action.floor);
    }

    case "RENAME_FLOOR": {
      return updateFloor(state, action.floorId, (floor) => ({
        ...floor,
        name: action.name,
      }));
    }

    case "NORMALIZE_FLOOR": {
      return updateFloor(state, action.floorId, (floor) => normalizeToContent(floor));
    }

    case "PASTE_REGION": {
      return updateFloor(state, action.floorId, (floor) => {
        const { region } = action;
        const rect = rectOf(
          action.x,
          action.y,
          action.x + region.width - 1,
          action.y + region.height - 1,
        );
        const next = grow(floor, rect);
        const cells = [...next.cells];
        for (let ry = 0; ry < region.height; ry++) {
          for (let rx = 0; rx < region.width; rx++) {
            const idx = arrayIndex(next, action.x + rx, action.y + ry);
            if (idx !== null) {
              cells[idx] = { ...region.cells[ry * region.width + rx] };
            }
          }
        }

        const hWalls = [...next.hWalls];
        const vWalls = [...next.vWalls];
        for (let ry = 0; ry <= region.height; ry++) {
          for (let rx = 0; rx < region.width; rx++) {
            const ax = action.x + rx - next.originX;
            const ay = action.y + ry - next.originY;
            if (ax >= 0 && ax < next.width && ay >= 0 && ay <= next.height) {
              const w = region.hWalls[ry * region.width + rx];
              if (w !== "none") hWalls[ay * next.width + ax] = w;
            }
          }
        }
        for (let ry = 0; ry < region.height; ry++) {
          for (let rx = 0; rx <= region.width; rx++) {
            const ax = action.x + rx - next.originX;
            const ay = action.y + ry - next.originY;
            if (ax >= 0 && ax <= next.width && ay >= 0 && ay < next.height) {
              const w = region.vWalls[ry * (region.width + 1) + rx];
              if (w !== "none") vWalls[ay * (next.width + 1) + ax] = w;
            }
          }
        }
        return { ...next, cells, hWalls, vWalls };
      });
    }

    case "ERASE_REGION": {
      return updateFloor(state, action.floorId, (floor) => {
        const rect = rectOf(action.x1, action.y1, action.x2, action.y2);
        const anchors = new Set(anchorsIntersectingRect(floor, rect));
        const cells = floor.cells.map((cell, i) => {
          const x = floor.originX + (i % floor.width);
          const y = floor.originY + Math.floor(i / floor.width);
          const inRect = x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY;
          if (inRect) {
            return createCell();
          }
          if (anchors.has(i)) {
            return { ...cell, item: null };
          }
          return cell;
        });

        const edges: EdgeRef[] = [];
        for (let y = rect.minY; y <= rect.maxY; y++) {
          for (let x = rect.minX; x <= rect.maxX; x++) {
            edges.push(...cellEdges(x, y));
          }
        }
        return setWallsWorld({ ...floor, cells }, edges, "none", false);
      });
    }

    case "ERASE_CELL": {
      return updateFloor(state, action.floorId, (floor) => {
        const rect = rectOf(action.x, action.y, action.x, action.y);
        const anchors = new Set(anchorsIntersectingRect(floor, rect));
        const cells = floor.cells.map((cell, i) =>
          anchors.has(i) ? { ...cell, item: null } : cell,
        );
        const cleared = setWallsWorld(
          { ...floor, cells },
          cellEdges(action.x, action.y),
          "none",
          false,
        );
        return setCellAt(cleared, action.x, action.y, () => createCell());
      });
    }

    case "FILL_ROOM": {
      return updateFloor(state, action.floorId, (floor) => {
        const idx = arrayIndex(floor, action.x, action.y);
        if (idx === null) {
          return floor;
        }
        const rooms = detectRooms(floor);
        const room = rooms.find((r) => r.cells.includes(idx));
        if (!room) {
          return floor;
        }
        const cells = [...floor.cells];
        for (const i of room.cells) {
          if (cells[i].floorType === null) {
            cells[i] = { ...cells[i], floorType: action.floorType };
          }
        }
        return { ...floor, cells };
      });
    }

    case "SET_ROOM_NAME": {
      return updateFloor(state, action.floorId, (floor) => {
        const idx = arrayIndex(floor, action.x, action.y);
        if (idx === null) {
          return floor;
        }
        const rooms = detectRooms(floor);
        const room = rooms.find((r) => r.cells.includes(idx));
        if (!room) {
          return floor;
        }
        // The name lives on the room's top-left anchor cell only.
        const tl = roomTopLeftCell(room, floor.width);
        const cells = [...floor.cells];
        cells[tl] = { ...cells[tl], roomName: action.roomName ?? undefined };
        return { ...floor, cells };
      });
    }

    case "ROTATE_FLOOR": {
      return updateFloor(state, action.floorId, (floor) =>
        normalizeToContent(rotateFloorCW90(floor)),
      );
    }

    case "FLIP_FLOOR": {
      return updateFloor(state, action.floorId, (floor) =>
        normalizeToContent(action.axis === "h" ? flipFloorH(floor) : flipFloorV(floor)),
      );
    }

    default: {
      return state;
    }
  }
}

// A room name lives on exactly one cell: the room's top-left anchor cell. It
// Stays as long as that cell is still the top-left cell of a detected room;
// Otherwise (walls redrawn so the anchor shifted, or the anchor cell erased)
// It is dropped. Names therefore never leak onto other rooms.
function reconcileNames(floor: FloorPlan): FloorPlan {
  const rooms = detectRooms(floor);
  const anchors = new Set<number>();
  for (const room of rooms) {
    anchors.add(roomTopLeftCell(room, floor.width));
  }
  let changed = false;
  const cells = floor.cells.map((cell, idx) => {
    if (cell.roomName === undefined || anchors.has(idx)) {
      return cell;
    }
    changed = true;
    return { ...cell, roomName: undefined };
  });
  return changed ? { ...floor, cells } : floor;
}

function clearAllNames(floor: FloorPlan): FloorPlan {
  let changed = false;
  const cells = floor.cells.map((cell) => {
    if (cell.roomName === undefined) {
      return cell;
    }
    changed = true;
    return { ...cell, roomName: undefined };
  });
  return changed ? { ...floor, cells } : floor;
}

const NAME_AFFECTING_ACTIONS: Action["type"][] = [
  "SET_ROOM_NAME",
  "SET_WALLS",
  "ERASE_CELL",
  "ERASE_REGION",
  "ROTATE_FLOOR",
  "FLIP_FLOOR",
  "CLEAR_FLOOR",
  "PASTE_REGION",
];

export function reducer(state: Building, action: Action): Building {
  const next = reducerImpl(state, action);
  if (!("floorId" in action)) {
    return next;
  }
  const floor = next.floors.find((f) => f.id === action.floorId);
  if (!floor || !NAME_AFFECTING_ACTIONS.includes(action.type)) {
    return next;
  }
  // Rotating, flipping or clearing the floor reshapes every room → drop all names.
  const reconciled =
    action.type === "ROTATE_FLOOR" || action.type === "FLIP_FLOOR" || action.type === "CLEAR_FLOOR"
      ? clearAllNames(floor)
      : reconcileNames(floor);
  if (reconciled === floor) {
    return next;
  }
  return { ...next, floors: next.floors.map((f) => (f.id === action.floorId ? reconciled : f)) };
}
