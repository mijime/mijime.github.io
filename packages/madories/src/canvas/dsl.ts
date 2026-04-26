import { v4 as uuidv4 } from "uuid";
import type { Cell, FloorPlan, FloorType, ItemType, WallType } from "../types";

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

  for (const { x1, y1, x2, y2, edge, wallType } of packWallRuns(cells, width, height)) {
    const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
    lines.push(`wall ${coord} ${edge} ${wallType}`);
  }

  for (const { x1, y1, x2, y2, floorType } of packFloorRects(cells, width, height)) {
    const coord = x1 === x2 && y1 === y2 ? `(${x1},${y1})` : `(${x1},${y1})-(${x2},${y2})`;
    lines.push(`floor ${coord} ${floorType}`);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { item } = cells[y * width + x];
      if (!item) {
        continue;
      }
      const rot = item.rotation !== 0 ? ` ${item.rotation}` : "";
      lines.push(`item (${x},${y}) ${item.type}${rot}`);
    }
  }

  return lines.join("\n");
}

// --- import ---

export function dslToFloor(text: string): FloorPlan {
  let width = 10;
  let height = 10;
  let name = "Floor";

  const cellOverrides = new Map<number, Partial<Cell>>();

  function getCell(idx: number): Partial<Cell> {
    return cellOverrides.get(idx) ?? {};
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

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

    // Wall (x1,y1)[-(x2,y2)] top|left wallType
    const wallMatch = line.match(
      /^wall\s+\((\d+),(\d+)\)(?:-\((\d+),(\d+)\))?\s+(top|left)\s+(\S+)$/,
    );
    if (wallMatch) {
      const x1 = Number.parseInt(wallMatch[1], 10);
      const y1 = Number.parseInt(wallMatch[2], 10);
      const x2 = wallMatch[3] !== undefined ? Number.parseInt(wallMatch[3], 10) : x1;
      const y2 = wallMatch[4] !== undefined ? Number.parseInt(wallMatch[4], 10) : y1;
      const edge = wallMatch[5] as "top" | "left";
      const wallType = wallMatch[6] as WallType;
      if (!WALL_TYPES.includes(wallType)) {
        continue;
      }
      for (let fy = y1; fy <= y2 && fy < height; fy++) {
        for (let fx = x1; fx <= x2 && fx < width; fx++) {
          const idx = fy * width + fx;
          const cur = getCell(idx);
          cellOverrides.set(idx, {
            ...cur,
            wall: {
              ...(cur.wall ?? { left: "none", top: "none" }),
              [edge]: wallType,
            },
          });
        }
      }
      continue;
    }

    // Floor (x1,y1)[-(x2,y2)] floorType
    const floorMatch = line.match(/^floor\s+\((\d+),(\d+)\)(?:-\((\d+),(\d+)\))?\s+(\w+)$/);
    if (floorMatch) {
      const x1 = Number.parseInt(floorMatch[1], 10);
      const y1 = Number.parseInt(floorMatch[2], 10);
      const x2 = floorMatch[3] !== undefined ? Number.parseInt(floorMatch[3], 10) : x1;
      const y2 = floorMatch[4] !== undefined ? Number.parseInt(floorMatch[4], 10) : y1;
      const floorType = floorMatch[5] as FloorType;
      for (let fy = y1; fy <= y2 && fy < height; fy++) {
        for (let fx = x1; fx <= x2 && fx < width; fx++) {
          const idx = fy * width + fx;
          cellOverrides.set(idx, { ...getCell(idx), floorType });
        }
      }
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
    }
  }

  const cells: Cell[] = [];
  for (let i = 0; i < width * height; i++) {
    const override = cellOverrides.get(i) ?? {};
    cells.push({
      floorType: override.floorType ?? null,
      item: override.item ?? null,
      wall: override.wall ?? { left: "none", top: "none" },
    });
  }

  return { cells, height, id: uuidv4(), name, width };
}
