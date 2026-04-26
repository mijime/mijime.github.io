import type { FloorPlan } from "../types";

export function drawTatamiCells(
  ctx: CanvasRenderingContext2D,
  floor: FloorPlan,
  cellSize: number,
  darkMode: boolean,
): void {
  const { width, height, cells } = floor;
  const lineColor = darkMode ? "rgba(255,220,120,0.25)" : "rgba(100,70,20,0.2)";

  ctx.save();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y * width + x].floorType !== "tatami") continue;

      const px = x * cellSize;
      const py = y * cellSize;
      const cs = cellSize;

      // Alternating direction per 2-cell block
      const isHorizontal = Math.floor(y / 2) % 2 === Math.floor(x / 2) % 2;

      ctx.beginPath();
      if (isHorizontal) {
        // Horizontal grain lines
        ctx.moveTo(px, py + cs * 0.25);
        ctx.lineTo(px + cs, py + cs * 0.25);
        ctx.moveTo(px, py + cs * 0.5);
        ctx.lineTo(px + cs, py + cs * 0.5);
        ctx.moveTo(px, py + cs * 0.75);
        ctx.lineTo(px + cs, py + cs * 0.75);
      } else {
        // Vertical grain lines
        ctx.moveTo(px + cs * 0.25, py);
        ctx.lineTo(px + cs * 0.25, py + cs);
        ctx.moveTo(px + cs * 0.5, py);
        ctx.lineTo(px + cs * 0.5, py + cs);
        ctx.moveTo(px + cs * 0.75, py);
        ctx.lineTo(px + cs * 0.75, py + cs);
      }
      ctx.stroke();

      // Inner border (畳の縁)
      const margin = cs * 0.06;
      ctx.strokeRect(px + margin, py + margin, cs - margin * 2, cs - margin * 2);
    }
  }

  ctx.restore();
}
