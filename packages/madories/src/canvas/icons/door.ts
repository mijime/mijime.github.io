export function drawDoor(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const lw = Math.max(1.5, Math.min(w, h) * 0.06);
  ctx.strokeStyle = darkMode ? "#C8A06E" : "#5C3317";
  ctx.lineWidth = lw;

  // Pivot: bottom-left corner
  const ax = px;
  const ay = py + h;
  const r = Math.min(w, h);

  // Door panel (closed position: vertical line on left)
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax, ay - r);
  ctx.stroke();

  // Swing arc (quarter circle from closed to open)
  ctx.beginPath();
  ctx.arc(ax, ay, r, -Math.PI / 2, 0);
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Door end (open position: horizontal line at bottom)
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + r, ay);
  ctx.stroke();
}
