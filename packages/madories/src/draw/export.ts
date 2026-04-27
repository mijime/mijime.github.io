import type { FloorPlan } from "../types";
import { WALL_WINDOW_SCORE } from "../types";
import { floorTypeToColor } from "../components/toolMode";
import { ITEM_DEF_MAP } from "../items";
import { drawGrid } from "./drawGrid";
import { drawItems } from "./drawItems";
import { drawVoidCells } from "./drawVoid";
import { drawWalls } from "./drawWalls";
import { drawRoomLabels } from "../floor/roomDetection";

const LABEL_HEIGHT = 24;
const BG = "#F5F0E8";
const DIM_COLOR = "#5A4A3A";
const GRID_COLOR = "rgba(90,74,58,0.25)"; // Same RGB as DIM_COLOR at 25% opacity
const DIM_MARGIN = 28; // Px reserved for dimension rulers

// 1 cell = 0.5 tatami = 910mm
export const MM_PER_CELL = 910;

export function computeFloorScores(floor: FloorPlan): { storage: number; windows: number } {
  let storage = 0;
  let windows = 0;
  for (const c of floor.cells) {
    if (c.item) {
      storage += ITEM_DEF_MAP.get(c.item.type)?.storageScore ?? 0;
    }
    for (const w of [c.wall.top, c.wall.left]) {
      windows += WALL_WINDOW_SCORE[w] ?? 0;
    }
  }
  return { storage, windows };
}

// For drawing crop (includes floor color and items)
export function computeBounds(
  floor: FloorPlan,
  region?: { x1: number; y1: number; x2: number; y2: number },
) {
  const x1 = region?.x1 ?? 0;
  const y1 = region?.y1 ?? 0;
  const x2 = region?.x2 ?? floor.width - 1;
  const y2 = region?.y2 ?? floor.height - 1;
  let minX = x2 + 1,
    minY = y2 + 1,
    maxX = x1 - 1,
    maxY = y1 - 1;
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const cell = floor.cells[y * floor.width + x];
      const used =
        cell.floorType !== null ||
        cell.wall.top !== "none" ||
        cell.wall.left !== "none" ||
        cell.item !== null;
      if (used) {
        if (x < minX) {
          minX = x;
        }
        if (y < minY) {
          minY = y;
        }
        if (x > maxX) {
          maxX = x;
        }
        if (y > maxY) {
          maxY = y;
        }
      }
    }
  }
  return maxX < x1 ? undefined : { maxX, maxY, minX, minY };
}

// For dimension display: wall edges only, no items/floor color
// Returns pixel coordinates of the bounding box of wall edges
export function computeWallDimensions(floor: FloorPlan, cellSize: number) {
  // MinWallX: leftmost x where a left-edge wall exists
  // MaxWallX: rightmost x where a left-edge wall exists (= right side of that wall)
  // MinWallY: topmost y where a top-edge wall exists
  // MaxWallY: bottommost y where a top-edge wall exists
  let minWallX = Infinity,
    maxWallX = -Infinity;
  let minWallY = Infinity,
    maxWallY = -Infinity;

  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const cell = floor.cells[y * floor.width + x];
      if (cell.wall.left !== "none") {
        if (x < minWallX) {
          minWallX = x;
        }
        if (x > maxWallX) {
          maxWallX = x;
        }
      }
      if (cell.wall.top !== "none") {
        if (y < minWallY) {
          minWallY = y;
        }
        if (y > maxWallY) {
          maxWallY = y;
        }
      }
    }
  }

  if (minWallX === Infinity && minWallY === Infinity) {
    return;
  }

  // Pixel positions of the wall lines
  const left = minWallX === Infinity ? undefined : minWallX * cellSize;
  const right = maxWallX === -Infinity ? undefined : maxWallX * cellSize;
  const top = minWallY === Infinity ? undefined : minWallY * cellSize;
  const bottom = maxWallY === -Infinity ? undefined : maxWallY * cellSize;

  return { bottom, left, right, top };
}

export function fmtMm(cells: number): string {
  const mm = cells * MM_PER_CELL;
  return mm >= 1000 ? `${(mm / 1000).toFixed(2)}m` : `${mm}mm`;
}

export function renderFloorToCanvas(floor: FloorPlan, cellSize: number): HTMLCanvasElement | null {
  const bounds = computeBounds(floor);
  if (!bounds) {
    return null;
  }

  const pad = 1;
  const x1 = Math.max(0, bounds.minX - pad);
  const y1 = Math.max(0, bounds.minY - pad);
  const x2 = Math.min(floor.width - 1, bounds.maxX + pad);
  const y2 = Math.min(floor.height - 1, bounds.maxY + pad);
  const cols = x2 - x1 + 1;
  const rows = y2 - y1 + 1;
  const fw = cols * cellSize;
  const fh = rows * cellSize;

  const totalW = fw + DIM_MARGIN;
  const totalH = fh + DIM_MARGIN;

  const offscreen = document.createElement("canvas");
  offscreen.width = totalW;
  offscreen.height = totalH;
  const ctx = offscreen.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, totalW, totalH);

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const cell = floor.cells[y * floor.width + x];
      const color = floorTypeToColor(cell.floorType, false);
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          DIM_MARGIN + (x - x1) * cellSize,
          DIM_MARGIN + (y - y1) * cellSize,
          cellSize,
          cellSize,
        );
      }
    }
  }
  drawVoidCells(
    ctx,
    floor,
    cellSize,
    DIM_COLOR,
    DIM_MARGIN - x1 * cellSize,
    DIM_MARGIN - y1 * cellSize,
  );

  ctx.save();
  ctx.translate(DIM_MARGIN - x1 * cellSize, DIM_MARGIN - y1 * cellSize);
  drawGrid(ctx, floor.width, floor.height, cellSize, GRID_COLOR);
  drawWalls(ctx, floor, cellSize, { ink: DIM_COLOR, windowBlue: "#4A90D9" });
  drawItems(ctx, floor, cellSize);
  drawRoomLabels(ctx, floor, cellSize, DIM_COLOR);
  ctx.restore();

  // Dimension labels based on wall edges only
  const wallDim = computeWallDimensions(floor, cellSize);
  if (wallDim) {
    const drawOffsetX = DIM_MARGIN - x1 * cellSize;
    const drawOffsetY = DIM_MARGIN - y1 * cellSize;
    const fmtPx = (px: number) => fmtMm(px / cellSize);

    ctx.save();
    ctx.fillStyle = DIM_COLOR;
    ctx.strokeStyle = DIM_COLOR;
    ctx.lineWidth = 1;
    ctx.font = "11px 'IBM Plex Mono', monospace";

    if (wallDim.left !== null && wallDim.right !== null) {
      const wx1 = wallDim.left! + drawOffsetX;
      const wx2 = wallDim.right! + drawOffsetX;
      const topY = DIM_MARGIN / 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.beginPath();
      ctx.moveTo(wx1, topY);
      ctx.lineTo(wx2, topY);
      ctx.stroke();
      for (const [ax, dir] of [
        [wx1, 1],
        [wx2, -1],
      ] as [number, number][]) {
        ctx.beginPath();
        ctx.moveTo(ax, topY);
        ctx.lineTo(ax + dir * 5, topY - 3);
        ctx.lineTo(ax + dir * 5, topY + 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillText(fmtPx(wallDim.right! - wallDim.left!), (wx1 + wx2) / 2, topY - 7);
    }

    if (wallDim.top !== null && wallDim.bottom !== null) {
      const wy1 = wallDim.top! + drawOffsetY;
      const wy2 = wallDim.bottom! + drawOffsetY;
      const leftX = DIM_MARGIN / 2;
      ctx.beginPath();
      ctx.moveTo(leftX, wy1);
      ctx.lineTo(leftX, wy2);
      ctx.stroke();
      for (const [ay, dir] of [
        [wy1, 1],
        [wy2, -1],
      ] as [number, number][]) {
        ctx.beginPath();
        ctx.moveTo(leftX, ay);
        ctx.lineTo(leftX - 3, ay + dir * 5);
        ctx.lineTo(leftX + 3, ay + dir * 5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.save();
      ctx.translate(leftX - 8, (wy1 + wy2) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(fmtPx(wallDim.bottom! - wallDim.top!), 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  return offscreen;
}

export function exportFloorPng(floor: FloorPlan, cellSize: number): void {
  const canvas = renderFloorToCanvas(floor, cellSize);
  if (!canvas) {
    return;
  }
  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, "image/png");
}

export function exportAllFloorsPng(floors: FloorPlan[], cellSize: number): void {
  const tsuboPerFloor = floors.map((f) => ({
    canvas: renderFloorToCanvas(f, cellSize),
    floor: f,
    name: f.name,
    tsubo: f.cells.filter((c) => c.floorType !== null).length / 4,
  }));
  const valid = tsuboPerFloor.filter((r) => r.canvas !== null) as {
    canvas: HTMLCanvasElement;
    floor: FloorPlan;
    name: string;
    tsubo: number;
  }[];
  if (valid.length === 0) {
    return;
  }

  let totalTsubo = 0;
  let totalStorage = 0;
  let totalWindows = 0;
  for (const r of valid) {
    totalTsubo += r.tsubo;
    const scores = computeFloorScores(r.floor);
    totalStorage += scores.storage;
    totalWindows += scores.windows;
  }
  const FOOTER_HEIGHT = LABEL_HEIGHT;
  const totalW = Math.max(...valid.map((r) => r.canvas.width));
  const totalH = valid.reduce((sum, r) => sum + r.canvas.height + LABEL_HEIGHT, 0) + FOOTER_HEIGHT;

  const combined = document.createElement("canvas");
  combined.width = totalW;
  combined.height = totalH;
  const ctx = combined.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, totalW, totalH);

  let offsetY = 0;
  for (const { name, tsubo, canvas, floor } of valid) {
    ctx.fillStyle = DIM_COLOR;
    ctx.font = "bold 13px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const { storage, windows } = computeFloorScores(floor);
    ctx.fillText(`${name}  ${tsubo.toFixed(2)}坪  収納:${storage}  窓:${windows}`, 8, offsetY + 16);
    offsetY += LABEL_HEIGHT;
    ctx.drawImage(canvas, 0, offsetY);
    offsetY += canvas.height;
  }

  // Total
  ctx.fillStyle = DIM_COLOR;
  ctx.font = "bold 13px 'IBM Plex Mono', monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(
    `合計 ${totalTsubo.toFixed(2)}坪  収納:${totalStorage}  窓:${totalWindows}`,
    totalW - 8,
    offsetY + 16,
  );

  combined.toBlob((blob) => {
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, "image/png");
}
