export function drawTv(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const depth = h * 0.2;
  ctx.fillStyle = darkMode ? "#111" : "#222";
  ctx.fillRect(px, py, w, depth);
  ctx.strokeStyle = darkMode ? "#333" : "#444";
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, w, depth);
  ctx.fillStyle = darkMode ? "#1a4466" : "#4488BB";
  ctx.fillRect(px + w * 0.05, py + depth * 0.15, w * 0.9, depth * 0.7);
}
