export function drawTv(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const depth = w * 0.2;
  ctx.fillStyle = darkMode ? "#111" : "#222";
  ctx.fillRect(px, py, depth, h);
  ctx.strokeStyle = darkMode ? "#333" : "#444";
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, depth, h);
  ctx.fillStyle = darkMode ? "#1a4466" : "#4488BB";
  ctx.fillRect(px + depth * 0.15, py + h * 0.05, depth * 0.7, h * 0.9);
}
