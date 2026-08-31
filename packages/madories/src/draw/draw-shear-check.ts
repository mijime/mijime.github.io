import type { FloorPlan } from "../types";
import { detectShearWallRuns, detectStackedColumns } from "../floor/shear-walls";
import { computeQuadrantBalance } from "../floor/quadrant-balance";
import { suggestWallRun, type WallSuggestion } from "../floor/wall-quantity";

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

export function drawShearCheck(
  ctx: CanvasRenderingContext2D,
  currentFloor: FloorPlan,
  allFloors: FloorPlan[],
  cellSize: number,
): void {
  ctx.save();
  ctx.lineCap = "round";

  // Runs on the current floor only (drawing every floor's would be cluttered).
  for (const run of detectShearWallRuns(currentFloor)) {
    ctx.strokeStyle = run.stable ? STABLE_COLOR : MARGINAL_COLOR;
    ctx.lineWidth = run.stable ? Math.max(4, cellSize * 0.28) : Math.max(2, cellSize * 0.14);
    ctx.beginPath();
    drawWallRun(ctx, run.x, run.y, run.cells, run.kind, cellSize);
    ctx.stroke();
  }

  // 通し柱 across the whole building.
  const radius = Math.max(3, cellSize * 0.22);
  for (const c of detectStackedColumns(allFloors)) {
    ctx.fillStyle = COLUMN_FILL;
    ctx.beginPath();
    ctx.arc(c.x * cellSize, c.y * cellSize, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = STABLE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawQuadrantOverlay(ctx, currentFloor, cellSize);

  ctx.restore();
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
    // Measured wall length in metres, per direction.
    ctx.font = `bold ${Math.max(10, cellSize * 0.34)}px 'IBM Plex Mono', monospace`;
    ctx.fillText(
      `横${(q.h / 1000).toFixed(1)}m 縦${(q.v / 1000).toFixed(1)}m`,
      cx,
      cy + dotR + cellSize * 0.85,
    );
    ctx.font = font;
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
