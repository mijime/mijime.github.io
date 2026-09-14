export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  gridColor: string,
): void {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, height * cellSize);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(width * cellSize, y * cellSize);
    ctx.stroke();
  }
}

/**
 * Draws grid lines across the given array-space rectangle, aligned to world
 * multiples of `step` (1 = 半間, 2 = 一間). Used for the unbounded canvas so the
 * grid never reveals the finite window border.
 */
export function drawInfiniteGrid(
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  originX: number,
  originY: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number,
  gridColor: string,
): void {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  const startX = Math.ceil((originX + x0) / step) * step - originX;
  for (let x = startX; x <= x1; x += step) {
    ctx.moveTo(x * cellSize, y0 * cellSize);
    ctx.lineTo(x * cellSize, y1 * cellSize);
  }
  const startY = Math.ceil((originY + y0) / step) * step - originY;
  for (let y = startY; y <= y1; y += step) {
    ctx.moveTo(x0 * cellSize, y * cellSize);
    ctx.lineTo(x1 * cellSize, y * cellSize);
  }
  ctx.stroke();
}
