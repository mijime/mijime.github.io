import { useCallback, useEffect, useRef } from "react";
import { drawGrid } from "../../canvas/drawGrid";
import { drawVoidCells } from "../../canvas/drawVoid";
import { drawWalls } from "../../canvas/drawWalls";
import { computeWallDimensions, fmtMm } from "../../canvas/export";
import { clearIconCache, getCachedIcon } from "../../canvas/icons/cache";
import { drawRoomLabels } from "../../canvas/roomDetection";
import { ITEM_DEF_MAP } from "../../items";
import type { FloorPlan, Item } from "../../types";
import { floorTypeToColor } from "../Toolbar";
import type { SelectionRef, ViewRef } from "./types";

interface Props {
  staticCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  dynamicCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  floor: FloorPlan;
  ghostFloors: FloorPlan[];
  cellSize: number;
  viewRef: ViewRef;
  selectionRef: SelectionRef;
  selectedItemCell: number | null;
  darkMode: boolean;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  floor: FloorPlan,
  cellSize: number,
  wallDim: ReturnType<typeof computeWallDimensions>,
) {
  drawRoomLabels(ctx, floor, cellSize, cssVar("--ink"), cssVar("--paper"));

  if (!wallDim) {
    return;
  }
  const ink = cssVar("--ink");
  const fmtPx = (px: number) => fmtMm(px / cellSize);
  ctx.save();
  ctx.font = "11px 'IBM Plex Mono', monospace";
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;

  if (wallDim.left !== null && wallDim.right !== null) {
    const topY = (wallDim.top ?? 0) - cellSize;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(wallDim.left!, topY);
    ctx.lineTo(wallDim.right!, topY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      fmtPx(wallDim.right! - wallDim.left!),
      (wallDim.left! + wallDim.right!) / 2,
      topY - 2,
    );
  }

  if (wallDim.top !== null && wallDim.bottom !== null) {
    const leftX = (wallDim.left ?? 0) - cellSize;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(leftX, wallDim.top!);
    ctx.lineTo(leftX, wallDim.bottom!);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(leftX - 2, (wallDim.top! + wallDim.bottom!) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(fmtPx(wallDim.bottom! - wallDim.top!), 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function drawItemsCached(
  ctx: CanvasRenderingContext2D,
  floor: FloorPlan,
  cellSize: number,
  darkMode: boolean,
): void {
  const { width, height, cells } = floor;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cells[y * width + x];
      if (!cell.item) {
        continue;
      }
      const def = ITEM_DEF_MAP.get(cell.item.type);
      if (!def) {
        continue;
      }
      const isRotated = cell.item.rotation === 90 || cell.item.rotation === 270;
      const effectiveW = isRotated ? def.h : def.w;
      const effectiveH = isRotated ? def.w : def.h;
      if (x + effectiveW > width || y + effectiveH > height) {
        continue;
      }
      drawItemAtCached(ctx, cell.item, x * cellSize, y * cellSize, cellSize, 1, darkMode);
    }
  }
}

function drawItemAtCached(
  ctx: CanvasRenderingContext2D,
  item: Item,
  px: number,
  py: number,
  cellSize: number,
  alpha: number,
  darkMode: boolean,
): void {
  const oc = getCachedIcon(item.type, item.rotation, cellSize, darkMode);
  if (!oc) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(oc, px, py);
  ctx.restore();
}

export function useCanvasDraw(props: Props): {
  redraw: (ghost?: { mx: number; my: number; fromIdx: number }) => void;
} {
  const {
    staticCanvasRef,
    dynamicCanvasRef,
    floor,
    ghostFloors,
    cellSize,
    viewRef,
    selectionRef,
    darkMode,
  } = props;

  const ghostFloorsRef = useRef<FloorPlan[]>(ghostFloors);
  ghostFloorsRef.current = ghostFloors;
  const wallDimRef = useRef<ReturnType<typeof computeWallDimensions>>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function drawStatic() {
    const canvas = staticCanvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = cssVar("--paper");
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { offsetX, offsetY, scale } = viewRef.current;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    for (let y = 0; y < floor.height; y++) {
      for (let x = 0; x < floor.width; x++) {
        const cell = floor.cells[y * floor.width + x];
        const color = floorTypeToColor(cell.floorType, darkMode);
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
    drawVoidCells(ctx, floor, cellSize, cssVar("--ink"));

    drawGrid(ctx, floor.width, floor.height, cellSize, cssVar("--grid"));
    const wallColors = {
      ink: cssVar("--ink"),
      windowBlue: cssVar("--window-blue"),
    };
    drawWalls(ctx, floor, cellSize, wallColors);

    ctx.restore();
  }

  function drawDynamic(ghost?: { mx: number; my: number; fromIdx: number }) {
    const canvas = dynamicCanvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { offsetX, offsetY, scale } = viewRef.current;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    // Ghost floors (other floors) drawn faintly
    ctx.save();
    ctx.globalAlpha = 0.15;
    const ghostWallColors = {
      ink: cssVar("--ink"),
      windowBlue: cssVar("--window-blue"),
    };
    for (const gf of ghostFloorsRef.current) {
      drawWalls(ctx, gf, cellSize, ghostWallColors);
    }
    ctx.restore();

    drawItemsCached(ctx, floor, cellSize, darkMode);

    if (ghost) {
      const { item } = floor.cells[ghost.fromIdx];
      if (item) {
        const cx = Math.floor(ghost.mx / cellSize);
        const cy = Math.floor(ghost.my / cellSize);
        drawItemAtCached(ctx, item, cx * cellSize, cy * cellSize, cellSize, 0.5, darkMode);
      }
    }

    const sel = selectionRef.current;
    if (sel) {
      const x1 = Math.min(sel.x1, sel.x2);
      const y1 = Math.min(sel.y1, sel.y2);
      const x2 = Math.max(sel.x1, sel.x2);
      const y2 = Math.max(sel.y1, sel.y2);
      const px = x1 * cellSize;
      const py = y1 * cellSize;
      const pw = (x2 - x1 + 1) * cellSize;
      const ph = (y2 - y1 + 1) * cellSize;
      ctx.fillStyle = "rgba(196,113,74,0.15)";
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = "rgba(196,113,74,0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, pw, ph);
    }

    if (wallDimRef.current) {
      drawOverlay(ctx, floor, cellSize, wallDimRef.current);
    }

    ctx.restore();

    // Tsubo count (bottom-right, screen-fixed)
    const usedCells = floor.cells.filter((c) => c.floorType !== null).length;
    if (usedCells > 0) {
      const tsubo = (usedCells / 4).toFixed(2);
      const label = `${tsubo}坪`;
      ctx.save();
      ctx.font = "bold 12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      const metrics = ctx.measureText(label);
      const tx = canvas.width - 6;
      const ty = canvas.height - 6;
      const pad = 3;
      ctx.fillStyle = cssVar("--paper");
      ctx.fillRect(tx - metrics.width - pad, ty - 12 - pad, metrics.width + pad * 2, 12 + pad * 2);
      ctx.fillStyle = cssVar("--ink");
      ctx.fillText(label, tx, ty);
      ctx.restore();
    }
  }

  // Biome-ignore lint/correctness/useExhaustiveDependencies: drawStatic/drawDynamic intentionally captured by closure; redraw stabilized on floor/cellSize
  const redraw = useCallback(
    (ghost?: { mx: number; my: number; fromIdx: number }) => {
      drawStatic();
      drawDynamic(ghost);

      // Debounced overlay: clear on any change, draw after 5s of inactivity
      wallDimRef.current = undefined;
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
      }
      overlayTimerRef.current = setTimeout(() => {
        wallDimRef.current = computeWallDimensions(floor, cellSize);
        drawDynamic();
      }, 5000);
    },
    [floor, cellSize, darkMode],
  );

  useEffect(() => {
    clearIconCache();
    redraw();
  }, [redraw]);

  return { redraw };
}
