export function drawTv(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  // Thin panel flush to top (wall side), top-down view
  const depth = h * 0.2;
  ctx.fillStyle = "#222";
  ctx.fillRect(px, py, w, depth);
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, w, depth);
  // Screen highlight
  ctx.fillStyle = "#4488BB";
  ctx.fillRect(px + w * 0.05, py + depth * 0.15, w * 0.9, depth * 0.7);
}
