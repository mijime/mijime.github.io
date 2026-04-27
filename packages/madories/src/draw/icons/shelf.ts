export function drawShelf(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const depth = w * 0.5;
  ctx.fillStyle = darkMode ? "#9a7840" : "#C8A87A";
  ctx.fillRect(px, py, depth * 0.3, h);
  ctx.fillStyle = darkMode ? "#b89050" : "#E0C89A";
  ctx.fillRect(px + depth * 0.3, py, depth * 0.7, h);
  ctx.strokeStyle = darkMode ? "#7a5820" : "#8B6914";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, depth, h);
  ctx.beginPath();
  ctx.moveTo(px + depth * 0.3, py);
  ctx.lineTo(px + depth * 0.3, py + h);
  ctx.stroke();
}
