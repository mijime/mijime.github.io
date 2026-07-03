import { v4 as uuidv4 } from "uuid";
import type { Cell, EdgeRef, FloorPlan, FloorType, ItemType, WallType } from "../types";
import { detectRooms } from "./room-detection";
import { hIndex, vIndex, createHWalls, createVWalls, getWall } from "./walls";

const WALL_TYPES: WallType[] = ["none", "solid", "solid_thin", "window_full", "window_center"];

type Side = "top" | "left" | "right" | "bottom";

function sideToEdge(x: number, y: number, side: Side): EdgeRef {
  if (side === "top") return { kind: "h", x, y };
  if (side === "bottom") return { kind: "h", x, y: y + 1 };
  if (side === "left") return { kind: "v", x, y };
  return { kind: "v", x: x + 1, y };
}

// --- floor rectangle packing ---

function rowMatchesFloor(
  remaining: (FloorType | undefined)[],
  row: number,
  startX: number,
  maxW: number,
  width: number,
  floorType: FloorType,
): boolean {
  for (let dx = 0; dx < maxW; dx++) {
    if (remaining[row * width + startX + dx] !== floorType) return false;
  }
  return true;
}

function packFloorRects(
  cells: Cell[],
  width: number,
  height: number,
): { x1: number; y1: number; x2: number; y2: number; floorType: FloorType }[] {
  const remaining = cells.map((c) => c.floorType ?? undefined);
  const rects: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    floorType: FloorType;
  }[] = [];

  // Scan top-left to bottom-right, greedily claim largest rectangle
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const floorType = remaining[y * width + x];
      if (!floorType) {
        continue;
      }

      // Find max rectangle starting at (x,y) with this floorType
      // First: max width along x
      let maxW = 0;
      while (x + maxW < width && remaining[y * width + x + maxW] === floorType) {
        maxW++;
      }

      // Then: max height where each row fits that width
      let maxH = 1;
      for (let dy = 1; y + dy < height; dy++) {
        const rowFits = rowMatchesFloor(remaining, y + dy, x, maxW, width, floorType);
        if (!rowFits) break;
        maxH++;
      }

      // Claim the rectangle
      for (let dy = 0; dy < maxH; dy++) {
        for (let dx = 0; dx < maxW; dx++) {
          remaining[(y + dy) * width + x + dx] = undefined;
        }
      }

      rects.push({ floorType, x1: x, x2: x + maxW - 1, y1: y, y2: y + maxH - 1 });
    }
  }

  return rects;
}

// --- wall run-length encoding ---

interface WallRun {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  side: Side;
  wallType: WallType;
}

function packWallRuns(
  hWalls: WallType[],
  vWalls: WallType[],
  width: number,
  height: number,
): WallRun[] {
  const runs: WallRun[] = [];

  // Horizontal runs: h walls along rows
  for (let y = 0; y <= height; y++) {
    let x = 0;
    while (x < width) {
      const wt = hWalls[hIndex(width, x, y)];
      if (wt === "none") {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < width && hWalls[hIndex(width, end, y)] === wt) {
        end++;
      }
      const side = y === height ? "bottom" : "top";
      const coordY = y === height ? y - 1 : y;
      runs.push({
        side,
        wallType: wt,
        x1: x,
        x2: end - 1,
        y1: coordY,
        y2: coordY,
      });
      x = end;
    }
  }

  // Vertical runs: v walls along columns
  for (let x = 0; x <= width; x++) {
    let y = 0;
    while (y < height) {
      const wt = vWalls[vIndex(width, x, y)];
      if (wt === "none") {
        y++;
        continue;
      }
      let end = y + 1;
      while (end < height && vWalls[vIndex(width, x, end)] === wt) {
        end++;
      }
      const side = x === width ? "right" : "left";
      const coordX = x === width ? x - 1 : x;
      runs.push({
        side,
        wallType: wt,
        x1: coordX,
        x2: coordX,
        y1: y,
        y2: end - 1,
      });
      y = end;
    }
  }

  return runs;
}

// --- export ---

export function floorToDsl(floor: FloorPlan): string {
  const { width, height, cells, name, hWalls, vWalls } = floor;
  const lines: string[] = [];

  lines.push(`size ${width} ${height}`);
  lines.push(`name "${name}"`);

  // Detect rooms and emit each as a pattern block
  const rooms = detectRooms(floor);
  const roomMinXY = rooms.map((r) => {
    let minX = Infinity,
      minY = Infinity;
    for (const idx of r.cells) {
      const x = idx % width;
      const y = Math.floor(idx / width);
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
    }
    return { minX, minY };
  });

  // Which cells belong to any room
  const inRoom = new Set(rooms.flatMap((r) => r.cells));

  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri];
    const { minX, minY } = roomMinXY[ri];
    const patternName = `room${ri + 1}`;
    lines.push(`pattern ${patternName}`);

    // Floor rects (only cells in this room, shifted to local coords)
    const roomCells = room.cells.map((idx) => {
      const gx = idx % width;
      const gy = Math.floor(idx / width);
      return { idx, lx: gx - minX, ly: gy - minY };
    });

    // Collect edges for this room
    const roomEdges = new Map<string, WallType>();
    for (const { lx, ly } of roomCells) {
      for (const side of ["top", "left", "right", "bottom"] as Side[]) {
        const edge = sideToEdge(lx, ly, side);
        const gx = lx + minX;
        const gy = ly + minY;
        const globalEdge = sideToEdge(gx, gy, side);
        const wallType = getWall(floor, globalEdge);
        if (wallType !== "none") {
          const key = `${edge.kind}:${edge.x}:${edge.y}`;
          roomEdges.set(key, wallType);
        }
      }
    }

    for (const { x1, y1, x2, y2, floorType } of packFloorRects(
      roomCells.map((rc) => cells[rc.idx]),
      Math.max(...roomCells.map((c) => c.lx)) + 1,
      Math.max(...roomCells.map((c) => c.ly)) + 1,
    )) {
      const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
      lines.push(`  floor ${coord} ${floorType}`);
    }

    // Emit walls from the collected edges
    const wallRuns: WallRun[] = [];
    for (const [key, wallType] of roomEdges) {
      const [kind, xStr, yStr] = key.split(":");
      const x = Number.parseInt(xStr, 10);
      const y = Number.parseInt(yStr, 10);
      const edge: EdgeRef = { kind: kind as "h" | "v", x, y };

      if (edge.kind === "h") {
        wallRuns.push({
          side: "top",
          wallType,
          x1: x,
          x2: x,
          y1: y,
          y2: y,
        });
      } else {
        wallRuns.push({
          side: "left",
          wallType,
          x1: x,
          x2: x,
          y1: y,
          y2: y,
        });
      }
    }

    for (const { x1, y1, x2, y2, side, wallType } of wallRuns) {
      const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
      lines.push(`  wall ${coord} ${side} ${wallType}`);
    }

    for (const { lx, ly, idx } of roomCells) {
      const { item } = cells[idx];
      if (item) {
        const rot = item.rotation === 0 ? "" : ` ${item.rotation}`;
        lines.push(`  item (${lx},${ly}) ${item.type}${rot}`);
      }
    }

    lines.push("end");
    lines.push(`place ${patternName} at (${minX},${minY})`);
  }

  // Walls not belonging to any room cell - use run-length encoding
  const nonRoomHWalls = createHWalls(width, height);
  const nonRoomVWalls = createVWalls(width, height);

  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y < height ? y * width + x : -1;
      if (idx < 0 || !inRoom.has(idx)) {
        nonRoomHWalls[hIndex(width, x, y)] = hWalls[hIndex(width, x, y)];
      }
    }
  }
  for (let x = 0; x <= width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      if (x >= width || !inRoom.has(idx)) {
        nonRoomVWalls[vIndex(width, x, y)] = vWalls[vIndex(width, x, y)];
      }
    }
  }

  for (const { x1, y1, x2, y2, side, wallType } of packWallRuns(
    nonRoomHWalls,
    nonRoomVWalls,
    width,
    height,
  )) {
    const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
    lines.push(`wall ${coord} ${side} ${wallType}`);
  }

  for (const { x1, y1, x2, y2, floorType } of packFloorRects(
    cells.map((c, idx) => (inRoom.has(idx) ? { ...c, floorType: null } : c)),
    width,
    height,
  )) {
    const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
    lines.push(`floor ${coord} ${floorType}`);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!inRoom.has(idx)) {
        const { item } = cells[idx];
        if (item) {
          const rot = item.rotation === 0 ? "" : ` ${item.rotation}`;
          lines.push(`item (${x},${y}) ${item.type}${rot}`);
        }
      }
    }
  }

  return lines.join("\n");
}

// --- import ---

interface PatternCell {
  x: number;
  y: number;
  floorType?: FloorType;
  item?: { type: ItemType; rotation: 0 | 90 | 180 | 270 };
}

interface PatternWall {
  edge: EdgeRef;
  type: WallType;
}

function rotateEdgeCW90(e: EdgeRef, maxY: number): EdgeRef {
  return e.kind === "h"
    ? { kind: "v", x: maxY + 1 - e.y, y: e.x }
    : { kind: "h", x: maxY - e.y, y: e.x };
}

function rotatePatternCW90(
  cells: PatternCell[],
  walls: PatternWall[],
  _maxX: number,
  maxY: number,
): { cells: PatternCell[]; walls: PatternWall[] } {
  const newCells = cells.map(({ x, y, floorType, item }) => {
    const nx = maxY - y;
    const ny = x;
    const newItem = item
      ? { ...item, rotation: ((item.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
      : undefined;
    return { floorType, item: newItem, x: nx, y: ny };
  });

  const newWalls = walls.map(({ edge, type }) => ({
    edge: rotateEdgeCW90(edge, maxY),
    type,
  }));

  return { cells: newCells, walls: newWalls };
}

function applyPatternCells(
  patternCells: PatternCell[],
  patternWalls: PatternWall[],
  rotate: 0 | 90 | 180 | 270,
  ox: number,
  oy: number,
  cellOverrides: Map<number, Partial<Cell>>,
  edgeWalls: Map<string, WallType>,
  width: number,
  height: number,
): void {
  let cells = patternCells;
  let walls = patternWalls;

  // Compute bounding box for rotation pivot
  let maxX = 0;
  let maxY = 0;
  for (const { x, y } of cells) {
    if (x > maxX) {
      maxX = x;
    }
    if (y > maxY) {
      maxY = y;
    }
  }

  const steps = rotate / 90;
  for (let i = 0; i < steps; i++) {
    const rotated = rotatePatternCW90(cells, walls, maxX, maxY);
    cells = rotated.cells;
    walls = rotated.walls;
    // After rotation new maxX=maxY, maxY=maxX
    const tmp = maxX;
    maxX = maxY;
    maxY = tmp;
  }

  for (const { x, y, floorType, item } of cells) {
    const fx = x + ox;
    const fy = y + oy;
    if (fx >= 0 && fy >= 0 && fx < width && fy < height) {
      const idx = fy * width + fx;
      const cur = cellOverrides.get(idx) ?? {};
      cellOverrides.set(idx, {
        ...cur,
        ...(floorType === undefined ? {} : { floorType }),
        ...(item === undefined ? {} : { item }),
      });
    }
  }

  for (const { edge, type } of walls) {
    const fx = edge.x + ox;
    const fy = edge.y + oy;

    const valid =
      edge.kind === "h"
        ? fx >= 0 && fx < width && fy >= 0 && fy <= height
        : fx >= 0 && fx <= width && fy >= 0 && fy < height;

    if (valid) {
      const key = `${edge.kind}:${fx}:${fy}`;
      edgeWalls.set(key, type);
    }
  }
}

function parseCoordBlocks(coordsStr: string): { x1: number; y1: number; x2: number; y2: number }[] {
  return coordsStr.split("&").flatMap((coordStr) => {
    const cm = coordStr.match(/^\((?<x1>\d+),(?<y1>\d+)\)(?:-\((?<x2>\d+),(?<y2>\d+)\))?$/u);
    if (!cm) {
      return [];
    }
    const x1 = Number.parseInt(cm.groups!.x1, 10);
    const y1 = Number.parseInt(cm.groups!.y1, 10);
    const x2 = cm.groups!.x2 === undefined ? x1 : Number.parseInt(cm.groups!.x2, 10);
    const y2 = cm.groups!.y2 === undefined ? y1 : Number.parseInt(cm.groups!.y2, 10);
    return [{ x1, x2, y1, y2 }];
  });
}

function upsertPatternFloor(
  patternCells: PatternCell[],
  x1: number,
  x2: number,
  fy: number,
  floorType: FloorType,
): void {
  for (let fx = x1; fx <= x2; fx++) {
    const existing = patternCells.find((c) => c.x === fx && c.y === fy);
    if (existing) {
      existing.floorType = floorType;
    } else {
      patternCells.push({ floorType, x: fx, y: fy });
    }
  }
}

export function dslToFloor(text: string): FloorPlan {
  let width = 10;
  let height = 10;
  let name = "Floor";

  const cellOverrides = new Map<number, Partial<Cell>>();
  const edgeWalls = new Map<string, WallType>();
  const patterns = new Map<string, { cells: PatternCell[]; walls: PatternWall[] }>();

  function getCell(idx: number): Partial<Cell> {
    return cellOverrides.get(idx) ?? {};
  }

  function applyWall(coordsStr: string, side: Side, wallType: WallType) {
    for (const { x1, y1, x2, y2 } of parseCoordBlocks(coordsStr)) {
      for (let fy = y1; fy <= y2; fy++) {
        for (let fx = x1; fx <= x2; fx++) {
          const edge = sideToEdge(fx, fy, side);

          const valid =
            edge.kind === "h"
              ? edge.x >= 0 && edge.x < width && edge.y >= 0 && edge.y <= height
              : edge.x >= 0 && edge.x <= width && edge.y >= 0 && edge.y < height;

          if (valid) {
            const key = `${edge.kind}:${edge.x}:${edge.y}`;
            edgeWalls.set(key, wallType);
          }
        }
      }
    }
  }

  function applyFloor(coordsStr: string, floorType: FloorType) {
    for (const { x1, y1, x2, y2 } of parseCoordBlocks(coordsStr)) {
      for (let fy = y1; fy <= y2 && fy < height; fy++) {
        for (let fx = x1; fx <= x2 && fx < width; fx++) {
          const idx = fy * width + fx;
          cellOverrides.set(idx, { ...getCell(idx), floorType });
        }
      }
    }
  }

  // Two-pass: collect pattern blocks first, then process main body
  const lines = text.split("\n").map((l) => l.trim());

  // First pass: extract pattern definitions
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const patternDefMatch = line.match(/^pattern\s+(?<name>\S+)$/u);
    if (patternDefMatch) {
      const patternName = patternDefMatch.groups!.name;
      const patternCells: PatternCell[] = [];
      const patternWalls: PatternWall[] = [];
      i++;
      while (i < lines.length && lines[i] !== "end") {
        const pl = lines[i];
        const wm = pl.match(
          /^wall\s+(?<coords>[\d(),&-]+)\s+(?<side>top|left|right|bottom)\s+(?<type>\S+)$/u,
        );
        if (wm) {
          const side = wm.groups!.side as Side;
          const wallType = wm.groups!.type as WallType;
          if (WALL_TYPES.includes(wallType)) {
            for (const { x1, y1, x2, y2 } of parseCoordBlocks(wm.groups!.coords)) {
              for (let fy = y1; fy <= y2; fy++) {
                for (let fx = x1; fx <= x2; fx++) {
                  const edge = sideToEdge(fx, fy, side);
                  patternWalls.push({ edge, type: wallType });
                }
              }
            }
          }
        }
        const fm = pl.match(/^floor\s+(?<coords>[\d(),&-]+)\s+(?<type>\w+)$/u);
        if (fm) {
          const floorType = fm.groups!.type as FloorType;
          for (const { x1, y1, x2, y2 } of parseCoordBlocks(fm.groups!.coords)) {
            for (let fy = y1; fy <= y2; fy++) {
              upsertPatternFloor(patternCells, x1, x2, fy, floorType);
            }
          }
        }
        const im = pl.match(
          /^item\s+\((?<x>\d+),(?<y>\d+)\)\s+(?<type>\S+)(?:\s+(?<rot>0|90|180|270))?$/u,
        );
        if (im) {
          const px = Number.parseInt(im.groups!.x, 10);
          const py = Number.parseInt(im.groups!.y, 10);
          const type = im.groups!.type as ItemType;
          const rotation = (im.groups!.rot ? Number.parseInt(im.groups!.rot, 10) : 0) as
            | 0
            | 90
            | 180
            | 270;
          const existing = patternCells.find((c) => c.x === px && c.y === py);
          if (existing) {
            existing.item = { rotation, type };
          } else {
            patternCells.push({ item: { rotation, type }, x: px, y: py });
          }
        }
        i++;
      }
      patterns.set(patternName, { cells: patternCells, walls: patternWalls });
    }
    i++;
  }

  // Second pass: process main commands
  let inPatternBlock = false;
  for (const line of lines) {
    if (!line || line.startsWith("#")) {
      continue;
    }

    if (/^pattern\s+/u.test(line)) {
      inPatternBlock = true;
      continue;
    }
    if (line === "end") {
      inPatternBlock = false;
      continue;
    }
    if (inPatternBlock) {
      continue;
    }

    const sizeMatch = line.match(/^size\s+(?<w>\d+)\s+(?<h>\d+)$/u);
    if (sizeMatch) {
      width = Number.parseInt(sizeMatch.groups!.w, 10);
      height = Number.parseInt(sizeMatch.groups!.h, 10);
      continue;
    }

    const nameMatch = line.match(/^name\s+"(?<n>[^"]*)$/u);
    if (nameMatch) {
      name = nameMatch.groups!.n;
      continue;
    }

    const wallMatch = line.match(
      /^wall\s+(?<coords>[\d(),&-]+)\s+(?<side>top|left|right|bottom)\s+(?<type>\S+)$/u,
    );
    if (wallMatch) {
      const side = wallMatch.groups!.side as Side;
      const wallType = wallMatch.groups!.type as WallType;
      if (WALL_TYPES.includes(wallType)) {
        applyWall(wallMatch.groups!.coords, side, wallType);
      }
      continue;
    }

    // Floor (x1,y1)[-(x2,y2)][&...] floorType
    const floorMatch = line.match(/^floor\s+(?<coords>[\d(),&-]+)\s+(?<type>\w+)$/u);
    if (floorMatch) {
      applyFloor(floorMatch.groups!.coords, floorMatch.groups!.type as FloorType);
      continue;
    }

    // Item (x,y) type [rotation]
    const itemMatch = line.match(
      /^item\s+\((?<x>\d+),(?<y>\d+)\)\s+(?<type>\S+)(?:\s+(?<rot>0|90|180|270))?$/u,
    );
    if (itemMatch) {
      const x = Number.parseInt(itemMatch.groups!.x, 10);
      const y = Number.parseInt(itemMatch.groups!.y, 10);
      const type = itemMatch.groups!.type as ItemType;
      const rotation = (itemMatch.groups!.rot ? Number.parseInt(itemMatch.groups!.rot, 10) : 0) as
        | 0
        | 90
        | 180
        | 270;
      if (x < width && y < height) {
        const idx = y * width + x;
        cellOverrides.set(idx, { ...getCell(idx), item: { rotation, type } });
      }
      continue;
    }

    // Place patternName at (x,y) [rotate 0|90|180|270]
    const placeMatch = line.match(
      /^place\s+(?<name>\S+)\s+at\s+\((?<x>\d+),(?<y>\d+)\)(?:\s+rotate\s+(?<rot>0|90|180|270))?$/u,
    );
    if (placeMatch) {
      const patternName = placeMatch.groups!.name;
      const ox = Number.parseInt(placeMatch.groups!.x, 10);
      const oy = Number.parseInt(placeMatch.groups!.y, 10);
      const rotate = (placeMatch.groups!.rot ? Number.parseInt(placeMatch.groups!.rot, 10) : 0) as
        | 0
        | 90
        | 180
        | 270;
      const pattern = patterns.get(patternName);
      if (pattern) {
        applyPatternCells(
          pattern.cells,
          pattern.walls,
          rotate,
          ox,
          oy,
          cellOverrides,
          edgeWalls,
          width,
          height,
        );
      }
      continue;
    }
  }

  // Build cells and walls
  const cells: Cell[] = [];
  for (let j = 0; j < width * height; j++) {
    const override = cellOverrides.get(j) ?? {};
    cells.push({
      floorType: override.floorType ?? null,
      item: override.item ?? null,
    });
  }

  // Create hWalls and vWalls from edgeWalls
  const hWalls = createHWalls(width, height);
  const vWalls = createVWalls(width, height);

  for (const [key, wallType] of edgeWalls) {
    const [kind, xStr, yStr] = key.split(":");
    const x = Number.parseInt(xStr, 10);
    const y = Number.parseInt(yStr, 10);

    if (kind === "h") {
      if (x >= 0 && x < width && y >= 0 && y <= height) {
        hWalls[hIndex(width, x, y)] = wallType;
      }
    } else {
      if (x >= 0 && x <= width && y >= 0 && y < height) {
        vWalls[vIndex(width, x, y)] = wallType;
      }
    }
  }

  return { cells, height, id: uuidv4(), name, width, hWalls, vWalls };
}
