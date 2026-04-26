import type { FloorPlan } from "../types";

export function drawVoidCells(
  ctx: CanvasRenderingContext2D,
  floor: FloorPlan,
  cellSize: number,
  color: string,
  offsetX = 0,
  offsetY = 0,
): void {
  const voidCells: { px: number; py: number }[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (floor.cells[y * floor.width + x].floorType === "void") {
        voidCells.push({ px: offsetX + x * cellSize, py: offsetY + y * cellSize });
      }
    }
  }
  if (voidCells.length === 0) { return; }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 3]);
  for (const { px, py } of voidCells) {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + cellSize, py + cellSize);
    ctx.moveTo(px + cellSize, py);
    ctx.lineTo(px, py + cellSize);
    ctx.stroke();
  }
  ctx.restore();
}
