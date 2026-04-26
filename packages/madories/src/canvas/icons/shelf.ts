export function drawShelf(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  // Half-depth: only top 50% of cell
  const depth = h * 0.5;
  // Thick back panel flush to top (wall side)
  ctx.fillStyle = "#C8A87A";
  ctx.fillRect(px, py, w, depth * 0.3);
  // Shelf body
  ctx.fillStyle = "#E0C89A";
  ctx.fillRect(px, py + depth * 0.3, w, depth * 0.7);
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, w, depth);
  // Divider line between back and shelf
  ctx.beginPath();
  ctx.moveTo(px, py + depth * 0.3);
  ctx.lineTo(px + w, py + depth * 0.3);
  ctx.stroke();
}
