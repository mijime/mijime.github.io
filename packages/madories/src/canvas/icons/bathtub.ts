import { roundRect } from "./roundRect";

export function drawBathtub(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  ctx.fillStyle = darkMode ? "#4a8aaa" : "#ADD8E6";
  const radius = Math.min(w, h) * 0.15;
  roundRect(ctx, px + w * 0.1, py + h * 0.1, w * 0.8, h * 0.8, radius);
  ctx.fill();

  ctx.strokeStyle = darkMode ? "#5aaac8" : "#4A90B8";
  ctx.lineWidth = Math.max(2, w * 0.1);
  roundRect(ctx, px + w * 0.1, py + h * 0.1, w * 0.8, h * 0.8, radius);
  ctx.stroke();

  ctx.fillStyle = darkMode ? "#2a5a70" : "#E0FFFF";
  roundRect(ctx, px + w * 0.2, py + h * 0.2, w * 0.6, h * 0.6, radius * 0.8);
  ctx.fill();
}
