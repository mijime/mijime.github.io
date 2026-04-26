import { roundRect } from "./roundRect";

export function drawBed(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const radius = Math.min(w, h) * 0.08;
  ctx.strokeStyle = darkMode ? "#888888" : "#888888";
  ctx.lineWidth = Math.max(1, w * 0.05);

  ctx.fillStyle = darkMode ? "#6b5f50" : "#F0EAE0";
  roundRect(ctx, px, py + h * 0.25, w, h * 0.75, radius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = darkMode ? "#8a7d6e" : "#FFFFFF";
  roundRect(ctx, px + w * 0.15, py + h * 0.28, w * 0.7, h * 0.18, radius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = darkMode ? "#9b7845" : "#C8A87A";
  roundRect(ctx, px, py, w, h * 0.22, radius);
  ctx.fill();
  ctx.stroke();
}
