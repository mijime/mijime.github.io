export function drawShelf(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const depth = h * 0.5;
  ctx.fillStyle = darkMode ? "#5a3a10" : "#C8A87A";
  ctx.fillRect(px, py, w, depth * 0.3);
  ctx.fillStyle = darkMode ? "#7a5020" : "#E0C89A";
  ctx.fillRect(px, py + depth * 0.3, w, depth * 0.7);
  ctx.strokeStyle = darkMode ? "#3a2008" : "#8B6914";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, w, depth);
  ctx.beginPath();
  ctx.moveTo(px, py + depth * 0.3);
  ctx.lineTo(px + w, py + depth * 0.3);
  ctx.stroke();
}
