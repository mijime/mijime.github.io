import { v4 as uuidv4 } from "uuid";
import type { Cell, FloorPlan, FloorType, ItemType, WallType } from "../types";
import { detectRooms } from "./roomDetection";

const WALL_TYPES: WallType[] = ["none", "solid", "solid_thin", "window_full", "window_center"];

// --- floor rectangle packing ---

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
      outer: for (let dy = 1; y + dy < height; dy++) {
        for (let dx = 0; dx < maxW; dx++) {
          if (remaining[(y + dy) * width + x + dx] !== floorType) {
            break outer;
          }
        }
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
  edge: "top" | "left";
  wallType: WallType;
}

function packWallRuns(cells: Cell[], width: number, height: number): WallRun[] {
  const runs: WallRun[] = [];

  // Horizontal runs: top walls along rows (same y, increasing x)
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const wt = cells[y * width + x].wall.top;
      if (wt === "none") {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < width && cells[y * width + end].wall.top === wt) {
        end++;
      }
      runs.push({
        edge: "top",
        wallType: wt,
        x1: x,
        x2: end - 1,
        y1: y,
        y2: y,
      });
      x = end;
    }
  }

  // Vertical runs: left walls along columns (same x, increasing y)
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      const wt = cells[y * width + x].wall.left;
      if (wt === "none") {
        y++;
        continue;
      }
      let end = y + 1;
      while (end < height && cells[end * width + x].wall.left === wt) {
        end++;
      }
      runs.push({
        edge: "left",
        wallType: wt,
        x1: x,
        x2: x,
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
  const { width, height, cells, name } = floor;
  const lines: string[] = [];

  lines.push(`size ${width} ${height}`);
  lines.push(`name "${name}"`);

  // Detect rooms and emit each as a pattern block
  const rooms = detectRooms(floor);
  const roomMinXY = rooms.map((r) => {
    let minX = Infinity, minY = Infinity;
    for (const idx of r.cells) {
      const x = idx % width;
      const y = Math.floor(idx / width);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
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

    // Build a virtual grid for room cells + their right/bottom neighbors (for boundary walls)
    const lw = Math.max(...roomCells.map((c) => c.lx)) + 2;
    const lh = Math.max(...roomCells.map((c) => c.ly)) + 2;
    const virtualCells: Cell[] = Array.from({ length: lw * lh }, () => ({
      floorType: null,
      item: null,
      wall: { left: "none", top: "none" },
    }));
    const roomIdxSet = new Set(roomCells.map((c) => c.idx));
    for (const { idx, lx, ly } of roomCells) {
      const c = cells[idx];
      virtualCells[ly * lw + lx] = {
        floorType: c.floorType,
        item: c.item,
        wall: { ...c.wall },
      };
      // Pull in right neighbor's left wall if that neighbor is outside the room
      const rightIdx = idx + 1;
      const gx = idx % width;
      if (gx + 1 < width && !roomIdxSet.has(rightIdx)) {
        const rv = virtualCells[ly * lw + lx + 1];
        rv.wall = { ...rv.wall, left: cells[rightIdx].wall.left };
      }
      // Pull in bottom neighbor's top wall if that neighbor is outside the room
      const bottomIdx = idx + width;
      if (idx + width < width * height && !roomIdxSet.has(bottomIdx)) {
        const bv = virtualCells[(ly + 1) * lw + lx];
        bv.wall = { ...bv.wall, top: cells[bottomIdx].wall.top };
      }
    }

    for (const { x1, y1, x2, y2, floorType } of packFloorRects(virtualCells, lw, lh)) {
      const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
      lines.push(`  floor ${coord} ${floorType}`);
    }

    for (const { x1, y1, x2, y2, edge, wallType } of packWallRuns(virtualCells, lw, lh)) {
      const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
      lines.push(`  wall ${coord} ${edge} ${wallType}`);
    }

    for (const { lx, ly, idx } of roomCells) {
      const { item } = cells[idx];
      if (!item) continue;
      const rot = item.rotation !== 0 ? ` ${item.rotation}` : "";
      lines.push(`  item (${lx},${ly}) ${item.type}${rot}`);
    }

    lines.push("end");
    lines.push(`place ${patternName} at (${minX},${minY})`);
  }

  // Walls not belonging to any room cell
  const nonRoomCells = cells.map((c, idx) =>
    inRoom.has(idx) ? { ...c, wall: { left: "none" as WallType, top: "none" as WallType }, floorType: null, item: null } : c
  );

  for (const { x1, y1, x2, y2, edge, wallType } of packWallRuns(nonRoomCells, width, height)) {
    const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
    lines.push(`wall ${coord} ${edge} ${wallType}`);
  }

  for (const { x1, y1, x2, y2, floorType } of packFloorRects(nonRoomCells, width, height)) {
    const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
    lines.push(`floor ${coord} ${floorType}`);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (inRoom.has(idx)) continue;
      const { item } = cells[idx];
      if (!item) continue;
      const rot = item.rotation !== 0 ? ` ${item.rotation}` : "";
      lines.push(`item (${x},${y}) ${item.type}${rot}`);
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
  wallTop?: WallType;
  wallLeft?: WallType;
}

function rotatePatternCW90(cells: PatternCell[], maxX: number, maxY: number): PatternCell[] {
  return cells.map(({ x, y, floorType, item, wallTop, wallLeft }) => {
    const nx = maxY - y;
    const ny = x;
    const newItem = item
      ? { ...item, rotation: ((item.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
      : undefined;
    // CW90: top→left of (nx,ny), left→top of (nx,ny) but on the prev column boundary
    // top wall at (x,y) becomes left wall at (nx+1, ny) — handled by caller shifting
    // left wall at (x,y) becomes top wall at (nx, ny)
    return { x: nx, y: ny, floorType, item: newItem, wallTop: wallLeft, wallLeft: wallTop };
  });
}

function applyPatternCells(
  patternCells: PatternCell[],
  rotate: 0 | 90 | 180 | 270,
  ox: number,
  oy: number,
  cellOverrides: Map<number, Partial<Cell>>,
  width: number,
  height: number,
): void {
  let cells = patternCells;

  // Compute bounding box for rotation pivot
  let maxX = 0;
  let maxY = 0;
  for (const { x, y } of cells) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const steps = rotate / 90;
  for (let i = 0; i < steps; i++) {
    cells = rotatePatternCW90(cells, maxX, maxY);
    // After rotation new maxX=maxY, maxY=maxX
    const tmp = maxX;
    maxX = maxY;
    maxY = tmp;
  }

  for (const { x, y, floorType, item, wallTop, wallLeft } of cells) {
    const fx = x + ox;
    const fy = y + oy;
    if (fx < 0 || fy < 0 || fx >= width || fy >= height) continue;
    const idx = fy * width + fx;
    const cur = cellOverrides.get(idx) ?? {};
    const wall = cur.wall ?? { left: "none", top: "none" };
    cellOverrides.set(idx, {
      ...cur,
      ...(floorType !== undefined ? { floorType } : {}),
      ...(item !== undefined ? { item } : {}),
      wall: {
        top: wallTop ?? wall.top,
        left: wallLeft ?? wall.left,
      },
    });
  }
}

function parseCoordBlocks(coordsStr: string): { x1: number; y1: number; x2: number; y2: number }[] {
  return coordsStr.split("&").flatMap((coordStr) => {
    const cm = coordStr.match(/^\((\d+),(\d+)\)(?:-\((\d+),(\d+)\))?$/);
    if (!cm) return [];
    const x1 = Number.parseInt(cm[1], 10);
    const y1 = Number.parseInt(cm[2], 10);
    const x2 = cm[3] !== undefined ? Number.parseInt(cm[3], 10) : x1;
    const y2 = cm[4] !== undefined ? Number.parseInt(cm[4], 10) : y1;
    return [{ x1, y1, x2, y2 }];
  });
}

export function dslToFloor(text: string): FloorPlan {
  let width = 10;
  let height = 10;
  let name = "Floor";

  const cellOverrides = new Map<number, Partial<Cell>>();
  const patterns = new Map<string, PatternCell[]>();

  function getCell(idx: number): Partial<Cell> {
    return cellOverrides.get(idx) ?? {};
  }

  function applyWall(coordsStr: string, edge: "top" | "left", wallType: WallType) {
    for (const { x1, y1, x2, y2 } of parseCoordBlocks(coordsStr)) {
      for (let fy = y1; fy <= y2 && fy < height; fy++) {
        for (let fx = x1; fx <= x2 && fx < width; fx++) {
          const idx = fy * width + fx;
          const cur = getCell(idx);
          cellOverrides.set(idx, {
            ...cur,
            wall: { ...(cur.wall ?? { left: "none", top: "none" }), [edge]: wallType },
          });
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
    const patternDefMatch = line.match(/^pattern\s+(\S+)$/);
    if (patternDefMatch) {
      const patternName = patternDefMatch[1];
      const patternCells: PatternCell[] = [];
      i++;
      while (i < lines.length && lines[i] !== "end") {
        const pl = lines[i];
        const wm = pl.match(/^wall\s+([\d(),&-]+)\s+(top|left)\s+(\S+)$/);
        if (wm) {
          const edge = wm[2] as "top" | "left";
          const wallType = wm[3] as WallType;
          if (WALL_TYPES.includes(wallType)) {
            for (const { x1, y1, x2, y2 } of parseCoordBlocks(wm[1])) {
              for (let fy = y1; fy <= y2; fy++) {
                for (let fx = x1; fx <= x2; fx++) {
                  const existing = patternCells.find((c) => c.x === fx && c.y === fy);
                  if (existing) {
                    if (edge === "top") existing.wallTop = wallType;
                    else existing.wallLeft = wallType;
                  } else {
                    patternCells.push({
                      x: fx,
                      y: fy,
                      ...(edge === "top" ? { wallTop: wallType } : { wallLeft: wallType }),
                    });
                  }
                }
              }
            }
          }
        }
        const fm = pl.match(/^floor\s+([\d(),&-]+)\s+(\w+)$/);
        if (fm) {
          const floorType = fm[2] as FloorType;
          for (const { x1, y1, x2, y2 } of parseCoordBlocks(fm[1])) {
            for (let fy = y1; fy <= y2; fy++) {
              for (let fx = x1; fx <= x2; fx++) {
                const existing = patternCells.find((c) => c.x === fx && c.y === fy);
                if (existing) existing.floorType = floorType;
                else patternCells.push({ x: fx, y: fy, floorType });
              }
            }
          }
        }
        const im = pl.match(/^item\s+\((\d+),(\d+)\)\s+(\S+)(?:\s+(0|90|180|270))?$/);
        if (im) {
          const px = Number.parseInt(im[1], 10);
          const py = Number.parseInt(im[2], 10);
          const type = im[3] as ItemType;
          const rotation = (im[4] ? Number.parseInt(im[4], 10) : 0) as 0 | 90 | 180 | 270;
          const existing = patternCells.find((c) => c.x === px && c.y === py);
          if (existing) existing.item = { type, rotation };
          else patternCells.push({ x: px, y: py, item: { type, rotation } });
        }
        i++;
      }
      patterns.set(patternName, patternCells);
    }
    i++;
  }

  // Second pass: process main commands
  let inPatternBlock = false;
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;

    if (line.match(/^pattern\s+/)) { inPatternBlock = true; continue; }
    if (line === "end") { inPatternBlock = false; continue; }
    if (inPatternBlock) continue;

    const sizeMatch = line.match(/^size\s+(\d+)\s+(\d+)$/);
    if (sizeMatch) {
      width = Number.parseInt(sizeMatch[1], 10);
      height = Number.parseInt(sizeMatch[2], 10);
      continue;
    }

    const nameMatch = line.match(/^name\s+"([^"]*)"$/);
    if (nameMatch) {
      name = nameMatch[1];
      continue;
    }

    // Wall (x1,y1)[-(x2,y2)][&...] top|left wallType
    const wallMatch = line.match(/^wall\s+([\d(),&-]+)\s+(top|left)\s+(\S+)$/);
    if (wallMatch) {
      const edge = wallMatch[2] as "top" | "left";
      const wallType = wallMatch[3] as WallType;
      if (WALL_TYPES.includes(wallType)) applyWall(wallMatch[1], edge, wallType);
      continue;
    }

    // Floor (x1,y1)[-(x2,y2)][&...] floorType
    const floorMatch = line.match(/^floor\s+([\d(),&-]+)\s+(\w+)$/);
    if (floorMatch) {
      applyFloor(floorMatch[1], floorMatch[2] as FloorType);
      continue;
    }

    // Item (x,y) type [rotation]
    const itemMatch = line.match(/^item\s+\((\d+),(\d+)\)\s+(\S+)(?:\s+(0|90|180|270))?$/);
    if (itemMatch) {
      const x = Number.parseInt(itemMatch[1], 10);
      const y = Number.parseInt(itemMatch[2], 10);
      const type = itemMatch[3] as ItemType;
      const rotation = (itemMatch[4] ? Number.parseInt(itemMatch[4], 10) : 0) as 0 | 90 | 180 | 270;
      if (x < width && y < height) {
        const idx = y * width + x;
        cellOverrides.set(idx, { ...getCell(idx), item: { rotation, type } });
      }
      continue;
    }

    // place patternName at (x,y) [rotate 0|90|180|270]
    const placeMatch = line.match(/^place\s+(\S+)\s+at\s+\((\d+),(\d+)\)(?:\s+rotate\s+(0|90|180|270))?$/);
    if (placeMatch) {
      const patternName = placeMatch[1];
      const ox = Number.parseInt(placeMatch[2], 10);
      const oy = Number.parseInt(placeMatch[3], 10);
      const rotate = (placeMatch[4] ? Number.parseInt(placeMatch[4], 10) : 0) as 0 | 90 | 180 | 270;
      const patternCells = patterns.get(patternName);
      if (patternCells) {
        applyPatternCells(patternCells, rotate, ox, oy, cellOverrides, width, height);
      }
      continue;
    }
  }

  const cells: Cell[] = [];
  for (let j = 0; j < width * height; j++) {
    const override = cellOverrides.get(j) ?? {};
    cells.push({
      floorType: override.floorType ?? null,
      item: override.item ?? null,
      wall: override.wall ?? { left: "none", top: "none" },
    });
  }

  return { cells, height, id: uuidv4(), name, width };
}
