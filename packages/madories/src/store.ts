import { v4 as uuidv4 } from "uuid";
import { detectRooms } from "./floor/roomDetection";
import type { Building, Cell, CopiedRegion, FloorPlan, FloorType, Item, WallType } from "./types";

function createCell(): Cell {
  return {
    floorType: null,
    item: null,
    wall: { left: "none", top: "none" },
  };
}

export function createFloorPlan(name: string, width = 20, height = 20): FloorPlan {
  return {
    cells: Array.from({ length: width * height }, createCell),
    height,
    id: uuidv4(),
    name,
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
      type: "SET_WALL";
      floorId: string;
      cellIndex: number;
      edge: "top" | "left";
      wallType: WallType;
    }
  | {
      type: "SET_FLOOR_TYPE";
      floorId: string;
      cellIndex: number;
      floorType: FloorType | null;
    }
  | { type: "PLACE_ITEM"; floorId: string; cellIndex: number; item: Item }
  | { type: "REMOVE_ITEM"; floorId: string; cellIndex: number }
  | { type: "ROTATE_ITEM"; floorId: string; cellIndex: number }
  | { type: "MOVE_ITEM"; floorId: string; fromIndex: number; toIndex: number }
  | { type: "ADD_FLOOR" }
  | { type: "IMPORT_FLOOR"; floor: FloorPlan }
  | { type: "REPLACE_FLOOR"; floorId: string; floor: FloorPlan }
  | { type: "RENAME_FLOOR"; floorId: string; name: string }
  | { type: "CLEAR_FLOOR"; floorId: string }
  | { type: "REMOVE_FLOOR"; floorId: string }
  | {
      type: "PASTE_REGION";
      floorId: string;
      originIndex: number;
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
  | { type: "ERASE_CELL"; floorId: string; cellIndex: number }
  | { type: "FILL_ROOM"; floorId: string; cellIndex: number; floorType: FloorType }
  | { type: "ROTATE_FLOOR"; floorId: string };

function updateFloor(state: Building, floorId: string, fn: (f: FloorPlan) => FloorPlan): Building {
  return {
    ...state,
    floors: state.floors.map((f) => (f.id === floorId ? fn(f) : f)),
  };
}

function updateCell(floor: FloorPlan, cellIndex: number, fn: (c: Cell) => Cell): FloorPlan {
  return {
    ...floor,
    cells: floor.cells.map((c, i) => (i === cellIndex ? fn(c) : c)),
  };
}

export function reducer(state: Building, action: Action): Building {
  switch (action.type) {
    case "SET_WALL": {
      return updateFloor(state, action.floorId, (floor) =>
        updateCell(floor, action.cellIndex, (cell) => ({
          ...cell,
          wall: { ...cell.wall, [action.edge]: action.wallType },
        })),
      );
    }

    case "SET_FLOOR_TYPE": {
      return updateFloor(state, action.floorId, (floor) =>
        updateCell(floor, action.cellIndex, (cell) => ({
          ...cell,
          floorType: action.floorType,
        })),
      );
    }

    case "PLACE_ITEM": {
      return updateFloor(state, action.floorId, (floor) =>
        updateCell(floor, action.cellIndex, (cell) => ({
          ...cell,
          item: action.item,
        })),
      );
    }

    case "REMOVE_ITEM": {
      return updateFloor(state, action.floorId, (floor) =>
        updateCell(floor, action.cellIndex, (cell) => ({
          ...cell,
          item: null,
        })),
      );
    }

    case "ROTATE_ITEM": {
      return updateFloor(state, action.floorId, (floor) =>
        updateCell(floor, action.cellIndex, (cell) => {
          if (!cell.item) {
            return cell;
          }
          const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
          const nextRotation = rotations[(rotations.indexOf(cell.item.rotation) + 1) % 4];
          return { ...cell, item: { ...cell.item, rotation: nextRotation } };
        }),
      );
    }

    case "MOVE_ITEM": {
      return updateFloor(state, action.floorId, (floor) => {
        const { item } = floor.cells[action.fromIndex];
        if (!item) {
          return floor;
        }
        const cells = floor.cells.map((cell, i) => {
          if (i === action.fromIndex) {
            return { ...cell, item: null };
          }
          if (i === action.toIndex) {
            return { ...cell, item };
          }
          return cell;
        });
        return { ...floor, cells };
      });
    }

    case "CLEAR_FLOOR": {
      return updateFloor(state, action.floorId, (floor) => ({
        ...floor,
        cells: Array.from({ length: floor.width * floor.height }, createCell),
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

    case "PASTE_REGION": {
      return updateFloor(state, action.floorId, (floor) => {
        const ox = action.originIndex % floor.width;
        const oy = Math.floor(action.originIndex / floor.width);
        const cells = [...floor.cells];
        for (let ry = 0; ry < action.region.height; ry++) {
          for (let rx = 0; rx < action.region.width; rx++) {
            const tx = ox + rx;
            const ty = oy + ry;
            if (tx >= floor.width || ty >= floor.height) {
              continue;
            }
            cells[ty * floor.width + tx] = {
              ...action.region.cells[ry * action.region.width + rx],
            };
          }
        }
        return { ...floor, cells };
      });
    }

    case "ERASE_REGION": {
      return updateFloor(state, action.floorId, (floor) => ({
        ...floor,
        cells: floor.cells.map((cell, i) => {
          const x = i % floor.width;
          const y = Math.floor(i / floor.width);
          if (x < action.x1 || x > action.x2 || y < action.y1 || y > action.y2) {
            return cell;
          }
          return createCell();
        }),
      }));
    }

    case "ERASE_CELL": {
      return updateFloor(state, action.floorId, (floor) =>
        updateCell(floor, action.cellIndex, () => createCell()),
      );
    }

    case "FILL_ROOM": {
      return updateFloor(state, action.floorId, (floor) => {
        const rooms = detectRooms(floor);
        const room = rooms.find((r) => r.cells.includes(action.cellIndex));
        if (!room) {
          return floor;
        }
        const cells = [...floor.cells];
        for (const idx of room.cells) {
          if (cells[idx].floorType === null) {
            cells[idx] = { ...cells[idx], floorType: action.floorType };
          }
        }
        return { ...floor, cells };
      });
    }

    case "ROTATE_FLOOR": {
      return updateFloor(state, action.floorId, (floor) => {
        const { width, height, cells } = floor;
        // CW 90°: (x,y) → (nx=height-1-y, ny=x); newWidth=height, newHeight=width
        const newWidth = height;
        const newHeight = width;
        const newCells: Cell[] = Array.from({ length: newWidth * newHeight }, createCell);

        // First pass: copy floorType and item
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const src = cells[y * width + x];
            const nx = height - 1 - y;
            const ny = x;
            newCells[ny * newWidth + nx] = {
              ...newCells[ny * newWidth + nx],
              floorType: src.floorType,
              item: src.item
                ? { ...src.item, rotation: ((src.item.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
                : null,
            };
          }
        }

        // Second pass: rotate walls.
        // Src.wall.left (x-boundary at x, between x-1 and x) →
        //   After CW90, this vertical line becomes horizontal line → top of new (nx, ny)
        // Src.wall.top (y-boundary at y, between y-1 and y) →
        //   After CW90, this horizontal line becomes vertical line → left of new (nx+1, ny)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const src = cells[y * width + x];
            const nx = height - 1 - y;
            const ny = x;

            if (src.wall.left !== "none") {
              newCells[ny * newWidth + nx] = {
                ...newCells[ny * newWidth + nx],
                wall: { ...newCells[ny * newWidth + nx].wall, top: src.wall.left },
              };
            }

            if (src.wall.top !== "none" && nx + 1 < newWidth) {
              newCells[ny * newWidth + (nx + 1)] = {
                ...newCells[ny * newWidth + (nx + 1)],
                wall: { ...newCells[ny * newWidth + (nx + 1)].wall, left: src.wall.top },
              };
            }
          }
        }

        return { ...floor, cells: newCells, height: newHeight, width: newWidth };
      });
    }

    default: {
      return state;
    }
  }
}
