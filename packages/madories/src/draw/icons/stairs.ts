export function drawStairs(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = "#D3C9B0";
  ctx.fillRect(px, py, w, h);
  ctx.strokeStyle = "#7A6F5A";
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, w, h);

  const steps = 6;
  ctx.strokeStyle = "#7A6F5A";
  ctx.lineWidth = 1;
  for (let i = 1; i < steps; i++) {
    const y = py + (h / steps) * i;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px + w, y);
    ctx.stroke();
  }

  // Arrow indicating direction (bottom to top)
  const mx = px + w / 2;
  ctx.strokeStyle = "#5A4F3C";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mx, py + h * 0.85);
  ctx.lineTo(mx, py + h * 0.15);
  ctx.moveTo(mx - w * 0.15, py + h * 0.3);
  ctx.lineTo(mx, py + h * 0.15);
  ctx.lineTo(mx + w * 0.15, py + h * 0.3);
  ctx.stroke();
}
