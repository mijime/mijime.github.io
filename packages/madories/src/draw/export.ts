import type { FloorPlan, ItemType, WallType } from "../types";
import { WALL_WINDOW_SCORE } from "../types";
import { FLOOR_TYPES, floorTypeToColor } from "../components/toolMode";
import {
  ITEM_DEF_MAP,
  ITEM_GROUP_REPRESENTATIVE,
  ITEM_LEGEND_LABEL,
  WALL_LEGEND_LABEL,
} from "../items";
import { getCachedIcon } from "./icons/cache";
import { drawGrid } from "./drawGrid";
import { drawItems } from "./drawItems";
import { drawTatamiCells } from "./drawTatami";
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
  drawTatamiCells(ctx, floor, cellSize, false);
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
  const usedFloorTypeSet = new Set<string>();
  const seenItemTypes = new Set<ItemType>();
  const usedItemTypes: ItemType[] = [];
  const seenWallTypes = new Set<WallType>();
  const usedWallTypes: WallType[] = [];
  const floorScores = new Map<string, { storage: number; windows: number }>();
  for (const r of valid) {
    totalTsubo += r.tsubo;
    const scores = computeFloorScores(r.floor);
    totalStorage += scores.storage;
    totalWindows += scores.windows;
    floorScores.set(r.floor.id, scores);
    for (const c of r.floor.cells) {
      if (c.floorType !== null) {
        usedFloorTypeSet.add(c.floorType);
      }
      if (c.item) {
        const rep = ITEM_GROUP_REPRESENTATIVE.get(c.item.type) ?? c.item.type;
        if (!seenItemTypes.has(rep)) {
          seenItemTypes.add(rep);
          usedItemTypes.push(rep);
        }
      }
      for (const wt of [c.wall.top, c.wall.left] as WallType[]) {
        if (wt !== "none" && !seenWallTypes.has(wt)) {
          seenWallTypes.add(wt);
          usedWallTypes.push(wt);
        }
      }
    }
  }
  const legendEntries = FLOOR_TYPES.filter((e) => e.type !== null && usedFloorTypeSet.has(e.type));
  const ICON_SIZE = 20;
  const FLOOR_SW = 16;
  const WALL_LINE_W = 32;
  const WALL_ITEM_W = WALL_LINE_W + 4 + 40;
  const FLOOR_ITEM_W = FLOOR_SW + 4 + 72;
  const ICON_ITEM_W = ICON_SIZE + 28;
  const totalW = Math.max(...valid.map((r) => r.canvas.width));
  const MARGIN = 8;
  const usableW = totalW - MARGIN * 2;

  function countRows(itemW: number, count: number): number {
    const perRow = Math.max(1, Math.floor(usableW / itemW));
    return Math.ceil(count / perRow);
  }

  const floorLegendRows =
    legendEntries.length > 0 ? countRows(FLOOR_ITEM_W, legendEntries.length) : 0;
  const wallLegendRows =
    usedWallTypes.length > 0 ? countRows(WALL_ITEM_W, usedWallTypes.length) : 0;
  const itemLegendRows =
    usedItemTypes.length > 0 ? countRows(ICON_ITEM_W, usedItemTypes.length) : 0;
  const FLOOR_LEGEND_HEIGHT = floorLegendRows * LABEL_HEIGHT;
  const WALL_LEGEND_HEIGHT = wallLegendRows * LABEL_HEIGHT;
  const ITEM_LEGEND_HEIGHT = itemLegendRows * (ICON_SIZE + 16);
  const FOOTER_HEIGHT =
    LABEL_HEIGHT + FLOOR_LEGEND_HEIGHT + WALL_LEGEND_HEIGHT + ITEM_LEGEND_HEIGHT;
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
    const { storage, windows } = floorScores.get(floor.id)!;
    ctx.fillText(`${name}  ${tsubo.toFixed(2)}坪  収納:${storage}  窓:${windows}`, 8, offsetY + 16);
    offsetY += LABEL_HEIGHT;
    ctx.drawImage(canvas, 0, offsetY);
    offsetY += canvas.height;
  }

  // Total + north arrow
  ctx.fillStyle = DIM_COLOR;
  ctx.font = "bold 13px 'IBM Plex Mono', monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(
    `合計 ${totalTsubo.toFixed(2)}坪  収納:${totalStorage}  窓:${totalWindows}`,
    totalW - 36,
    offsetY + 16,
  );
  // North arrow
  {
    const ax = totalW - 14;
    const ay = offsetY + LABEL_HEIGHT / 2;
    const al = 9;
    ctx.save();
    ctx.fillStyle = DIM_COLOR;
    ctx.strokeStyle = DIM_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay - al);
    ctx.lineTo(ax - 3, ay + al / 2);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax + 3, ay + al / 2);
    ctx.closePath();
    ctx.fill();
    ctx.font = "bold 8px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("N", ax, ay + al / 2 + 1);
    ctx.restore();
  }
  offsetY += LABEL_HEIGHT;

  if (legendEntries.length > 0) {
    const sw = FLOOR_SW;
    const perRow = Math.max(1, Math.floor(usableW / FLOOR_ITEM_W));
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let i = 0; i < legendEntries.length; i++) {
      const entry = legendEntries[i];
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const lx = MARGIN + col * FLOOR_ITEM_W;
      const rowY = offsetY + row * LABEL_HEIGHT;
      const lh = rowY + (LABEL_HEIGHT - sw) / 2;

      ctx.fillStyle = entry.light!;
      ctx.fillRect(lx, lh, sw, sw);

      if (entry.type === "tatami") {
        ctx.save();
        ctx.strokeStyle = "rgba(100,70,20,0.25)";
        ctx.lineWidth = 0.8;
        const mid = sw / 2;
        ctx.beginPath();
        ctx.moveTo(lx, lh + mid);
        ctx.lineTo(lx + sw, lh + mid);
        ctx.moveTo(lx + mid, lh);
        ctx.lineTo(lx + mid, lh + sw);
        ctx.stroke();
        ctx.strokeRect(lx + 1, lh + 1, sw - 2, sw - 2);
        ctx.restore();
      }
      if (entry.type === "void") {
        ctx.save();
        ctx.strokeStyle = "rgba(90,74,58,0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(lx, lh);
        ctx.lineTo(lx + sw, lh + sw);
        ctx.moveTo(lx + sw, lh);
        ctx.lineTo(lx, lh + sw);
        ctx.stroke();
        ctx.restore();
      }

      ctx.strokeStyle = DIM_COLOR;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(lx, lh, sw, sw);
      ctx.fillStyle = DIM_COLOR;
      ctx.fillText(entry.label, lx + sw + 4, rowY + LABEL_HEIGHT / 2);
    }
  }
  offsetY += FLOOR_LEGEND_HEIGHT;

  if (usedWallTypes.length > 0) {
    const perRow = Math.max(1, Math.floor(usableW / WALL_ITEM_W));
    const windowBlue = "#4A90D9";
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let i = 0; i < usedWallTypes.length; i++) {
      const wt = usedWallTypes[i];
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const lx = MARGIN + col * WALL_ITEM_W;
      const rowY = offsetY + row * LABEL_HEIGHT;
      const ly = rowY + LABEL_HEIGHT / 2;
      ctx.save();
      switch (wt) {
        case "solid": {
          ctx.strokeStyle = DIM_COLOR;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + WALL_LINE_W, ly);
          ctx.stroke();
          break;
        }
        case "solid_thin": {
          ctx.strokeStyle = DIM_COLOR;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 1.5]);
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + WALL_LINE_W, ly);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
        case "window_full": {
          ctx.strokeStyle = DIM_COLOR;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + WALL_LINE_W, ly);
          ctx.stroke();
          ctx.strokeStyle = windowBlue;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + WALL_LINE_W, ly);
          ctx.stroke();
          break;
        }
        case "window_center": {
          ctx.strokeStyle = DIM_COLOR;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + WALL_LINE_W * 0.25, ly);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(lx + WALL_LINE_W * 0.75, ly);
          ctx.lineTo(lx + WALL_LINE_W, ly);
          ctx.stroke();
          ctx.strokeStyle = windowBlue;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(lx + WALL_LINE_W * 0.25, ly);
          ctx.lineTo(lx + WALL_LINE_W * 0.75, ly);
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
      ctx.fillStyle = DIM_COLOR;
      ctx.fillText(WALL_LEGEND_LABEL[wt] ?? wt, lx + WALL_LINE_W + 4, ly);
    }
  }
  offsetY += WALL_LEGEND_HEIGHT;

  if (usedItemTypes.length > 0) {
    const rowH = ICON_SIZE + 16;
    const perRow = Math.max(1, Math.floor(usableW / ICON_ITEM_W));
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < usedItemTypes.length; i++) {
      const type = usedItemTypes[i];
      const def = ITEM_DEF_MAP.get(type);
      if (!def) {
        continue;
      }
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const lx = MARGIN + col * ICON_ITEM_W;
      const ly = offsetY + row * rowH + 4;
      const oc = getCachedIcon(type, 0, ICON_SIZE);
      if (oc) {
        ctx.drawImage(oc, lx, ly, ICON_SIZE, ICON_SIZE);
      }
      ctx.fillStyle = DIM_COLOR;
      ctx.fillText(
        ITEM_LEGEND_LABEL.get(type) ?? def.label,
        lx + ICON_SIZE / 2,
        ly + ICON_SIZE + 2,
      );
    }
  }

  combined.toBlob((blob) => {
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, "image/png");
}
