export function drawDoorSlide(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  const lw = Math.max(1, w * 0.03);

  // Rail (wall side, top)
  const railH = Math.max(2, h * 0.06);
  ctx.fillStyle = "#999";
  ctx.fillRect(px, py, w, railH);

  // Panel dimensions — two thin panels, offset to show sliding
  const panelH = h * 0.08;
  const panelW = w * 0.72;

  // Back panel (slightly right)
  const p1x = px + w * 0.22;
  const p1y = py + railH;
  ctx.fillStyle = "#C8A87A";
  ctx.fillRect(p1x, p1y, panelW, panelH);
  ctx.strokeStyle = "#8B6340";
  ctx.lineWidth = lw;
  ctx.strokeRect(p1x, p1y, panelW, panelH);

  // Front panel (slightly left, overlapping)
  const p2x = px + w * 0.06;
  const p2y = py + railH;
  ctx.fillStyle = "#DDB98A";
  ctx.fillRect(p2x, p2y, panelW, panelH);
  ctx.strokeStyle = "#8B6340";
  ctx.lineWidth = lw;
  ctx.strokeRect(p2x, p2y, panelW, panelH);

  // Handle on front panel
  const hx = p2x + panelW * 0.75;
  const hy = p2y + panelH * 0.5;
  ctx.fillStyle = "#6B4A2A";
  ctx.beginPath();
  ctx.arc(hx, hy, lw * 1.5, 0, Math.PI * 2);
  ctx.fill();
}
