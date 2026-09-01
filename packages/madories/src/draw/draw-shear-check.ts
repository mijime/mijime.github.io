import type { FloorPlan } from "../types";
import {
  detectLoadPathBreaks,
  detectShearWallRuns,
  detectStackedColumns,
} from "../floor/shear-walls";
import { computeQuadrantBalance } from "../floor/quadrant-balance";
import { suggestWallRun, type WallSuggestion } from "../floor/wall-quantity";
import { computeEccentricity } from "../floor/structure-metrics";

// Structural-wall run highlights (drawn over walls) and 通し柱 markers.
// Colors are semantic and theme-independent: stable runs = strong red, marginal
// 0.91m runs = amber, stacked columns = dark filled dots.
const STABLE_COLOR = "rgba(217,58,45,0.9)";
const MARGINAL_COLOR = "rgba(240,166,60,0.85)";
const COLUMN_FILL = "rgba(84,32,26,0.9)";
// 四分割法 overlay: centerlines + a severity-graded dot per quadrant.
const CENTERLINE_COLOR = "rgba(120,110,100,0.55)";
const LABEL_COLOR = "rgba(70,58,70,0.9)";
const NG_COLOR = "rgba(168,85,247,0.9)";
// Dot colour interpolates between these two by the quadrant's balance ratio.
const BAD_RGB: [number, number, number] = [168, 85, 247]; // Violet = a direction missing
const GOOD_RGB: [number, number, number] = [46, 160, 90]; // Green = balanced
const DOT_OUTLINE = "rgba(255,255,255,0.85)";
// Suggested shear-wall ghost.
const SUGGEST_COLOR = "rgba(59,130,246,0.9)"; // Blue dashed line
// Load-path-break markers: alpha varies with severity.
// 剛心 (rigidity center, blue cross) vs 重心 (mass center, white circle) markers.
const RIGID_COLOR = "rgba(59,130,246,0.95)";
const MASS_FILL = "rgba(255,255,255,0.95)";
const MASS_OUTLINE = "rgba(70,58,70,0.9)";
const ECC_LINE = "rgba(120,110,100,0.5)";

export function dotColor(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio));
  const r = Math.round(BAD_RGB[0] + (GOOD_RGB[0] - BAD_RGB[0]) * t);
  const g = Math.round(BAD_RGB[1] + (GOOD_RGB[1] - BAD_RGB[1]) * t);
  const b = Math.round(BAD_RGB[2] + (GOOD_RGB[2] - BAD_RGB[2]) * t);
  return `rgba(${r},${g},${b},0.92)`;
}

function drawWallRun(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cells: number,
  kind: "h" | "v",
  cellSize: number,
): void {
  ctx.moveTo(x * cellSize, y * cellSize);
  if (kind === "h") {
    ctx.lineTo((x + cells) * cellSize, y * cellSize);
  } else {
    ctx.lineTo(x * cellSize, (y + cells) * cellSize);
  }
}

// Draw a dashed ghost for a suggested shear wall location.
function drawGhostWall(
  ctx: CanvasRenderingContext2D,
  suggestion: WallSuggestion,
  cellSize: number,
): void {
  ctx.strokeStyle = SUGGEST_COLOR;
  ctx.lineWidth = 3;
  ctx.setLineDash([cellSize * 0.2, cellSize * 0.12]);
  ctx.beginPath();
  drawWallRun(ctx, suggestion.x, suggestion.y, suggestion.cells, suggestion.kind, cellSize);
  ctx.stroke();
  ctx.setLineDash([]);
}

export interface ShearLayerFlags {
  runs: boolean;
  columns: boolean;
  quadrant: boolean;
  breaks: boolean;
  rigid: boolean;
}

export const ALL_SHEAR_LAYERS: ShearLayerFlags = {
  breaks: true,
  columns: true,
  quadrant: true,
  rigid: true,
  runs: true,
};

export function drawShearCheck(
  ctx: CanvasRenderingContext2D,
  currentFloor: FloorPlan,
  floors: FloorPlan[],
  cellSize: number,
  layers: ShearLayerFlags,
): void {
  ctx.save();
  ctx.lineCap = "round";

  // Runs on the current floor only (drawing every floor's would be cluttered).
  if (layers.runs) {
    for (const run of detectShearWallRuns(currentFloor)) {
      ctx.strokeStyle = run.stable ? STABLE_COLOR : MARGINAL_COLOR;
      ctx.lineWidth = run.stable ? Math.max(4, cellSize * 0.28) : Math.max(2, cellSize * 0.14);
      ctx.beginPath();
      drawWallRun(ctx, run.x, run.y, run.cells, run.kind, cellSize);
      ctx.stroke();
    }
  }

  // 通し柱 across the whole building.
  if (layers.columns) {
    const radius = Math.max(3, cellSize * 0.22);
    for (const c of detectStackedColumns(floors)) {
      ctx.fillStyle = COLUMN_FILL;
      ctx.beginPath();
      ctx.arc(c.x * cellSize, c.y * cellSize, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = STABLE_COLOR;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  if (layers.breaks) {
    drawLoadBreakMarkers(ctx, currentFloor, floors, cellSize);
  }

  if (layers.rigid) {
    drawRigidCenterOverlay(ctx, currentFloor, cellSize);
  }

  if (layers.quadrant) {
    drawQuadrantOverlay(ctx, currentFloor, cellSize);
  }

  ctx.restore();
}

// 偏心率 visual: dashed segment from 重心 (mass center, white circle) to 剛心
// (rigidity center, blue cross). The longer the gap, the more torsion risk.
function drawRigidCenterOverlay(
  ctx: CanvasRenderingContext2D,
  floor: FloorPlan,
  cellSize: number,
): void {
  const ecc = computeEccentricity(floor);
  if (!ecc) {
    return;
  }
  const MM_PER_CELL = 910;
  const gx = (ecc.gx / MM_PER_CELL) * cellSize;
  const gy = (ecc.gy / MM_PER_CELL) * cellSize;
  const rx = (ecc.rx / MM_PER_CELL) * cellSize;
  const ry = (ecc.ry / MM_PER_CELL) * cellSize;

  ctx.strokeStyle = ECC_LINE;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([cellSize * 0.12, cellSize * 0.08]);
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(rx, ry);
  ctx.stroke();
  ctx.setLineDash([]);

  // 重心 — white circle.
  ctx.fillStyle = MASS_FILL;
  ctx.beginPath();
  ctx.arc(gx, gy, Math.max(3, cellSize * 0.16), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = MASS_OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 剛心 — blue cross.
  const arm = Math.max(4, cellSize * 0.28);
  ctx.strokeStyle = RIGID_COLOR;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.06);
  ctx.beginPath();
  ctx.moveTo(rx - arm, ry);
  ctx.lineTo(rx + arm, ry);
  ctx.moveTo(rx, ry - arm);
  ctx.lineTo(rx, ry + arm);
  ctx.stroke();
}

// 通りズレ (格下げ・ソフト) 表示: 上階壁端が下階と列が合ってない位置を、警告では
// なくアンバーの塗りダイヤで提示する。実構造上は梁・床ダイアフラムで伝わる
// のでNGではないが、視認性のため中塗り＋濃めの枠。濃淡は軽いseverityのみ。
function breakAlpha(length: number): number {
  const t = Math.min(1, Math.max(0, length / 2730));
  return 0.45 + 0.45 * t; // 0.45 … 0.90 — visible but not a hard NG
}

function drawLoadBreakMarkers(
  ctx: CanvasRenderingContext2D,
  currentFloor: FloorPlan,
  floors: FloorPlan[],
  cellSize: number,
): void {
  const activeIndex = floors.findIndex((f) => f.id === currentFloor.id);
  if (activeIndex === -1) {
    return;
  }
  const size = Math.max(5, cellSize * 0.36);
  for (const b of detectLoadPathBreaks(floors)) {
    if (b.floorIndex === activeIndex + 1 || b.floorIndex === activeIndex) {
      const a = breakAlpha(b.length);
      drawBreakDiamond(
        ctx,
        b.x,
        b.y,
        size,
        cellSize,
        `rgba(240,166,60,${(a * 0.75).toFixed(2)})`,
        `rgba(190,120,30,${a.toFixed(2)})`,
      );
    }
  }
}

function drawBreakDiamond(
  ctx: CanvasRenderingContext2D,
  vx: number,
  vy: number,
  size: number,
  cellSize: number,
  fill: string,
  stroke: string,
): void {
  const px = vx * cellSize;
  const py = vy * cellSize;
  ctx.beginPath();
  ctx.moveTo(px, py - size);
  ctx.lineTo(px + size, py);
  ctx.lineTo(px, py + size);
  ctx.lineTo(px - size, py);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// 四分割法 overlay: centerlines, a status dot per quadrant (green when both
// Directions are present, violet when a direction is missing), the measured
// Wall lengths, and dashed ghosts showing where to add a missing shear wall.
function drawQuadrantOverlay(
  ctx: CanvasRenderingContext2D,
  floor: FloorPlan,
  cellSize: number,
): void {
  const balance = computeQuadrantBalance(floor);
  const { bounds } = balance;
  if (!bounds) {
    return;
  }
  const { maxX, maxY, midX, midY, minX, minY } = bounds;

  ctx.save();
  ctx.strokeStyle = CENTERLINE_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([cellSize * 0.12, cellSize * 0.08]);
  ctx.beginPath();
  ctx.moveTo(midX * cellSize, minY * cellSize);
  ctx.lineTo(midX * cellSize, maxY * cellSize);
  ctx.moveTo(minX * cellSize, midY * cellSize);
  ctx.lineTo(maxX * cellSize, midY * cellSize);
  ctx.stroke();
  ctx.setLineDash([]);

  const dotR = Math.max(5, cellSize * 0.28);
  const font = `bold ${Math.max(11, cellSize * 0.42)}px 'IBM Plex Mono', monospace`;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const q of balance.quadrants) {
    const west = q.name === "NW" || q.name === "SW";
    const north = q.name === "NW" || q.name === "NE";
    const cx = ((west ? minX + midX : midX + maxX) / 2) * cellSize;
    const cy = ((north ? minY + midY : midY + maxY) / 2) * cellSize;

    ctx.fillStyle = dotColor(q.ratio);
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = DOT_OUTLINE;
    ctx.lineWidth = Math.max(1.5, cellSize * 0.07);
    ctx.stroke();

    const missing = q.h === 0 ? "横壁なし" : q.v === 0 ? "縦壁なし" : null;
    const note = missing ? `${q.name} ${missing}` : q.name;
    ctx.fillStyle = missing ? NG_COLOR : LABEL_COLOR;
    ctx.fillText(note, cx, cy + dotR + cellSize * 0.4);
  }

  // Dashed ghosts for missing directions (best place to add a wall).
  for (const q of balance.quadrants) {
    if (q.h === 0) {
      const s = suggestWallRun(floor, q.name, "h");
      if (s) {
        drawGhostWall(ctx, s, cellSize);
      }
    }
    if (q.v === 0) {
      const s = suggestWallRun(floor, q.name, "v");
      if (s) {
        drawGhostWall(ctx, s, cellSize);
      }
    }
  }

  ctx.restore();
}
