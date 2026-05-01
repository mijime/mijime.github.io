import { roundRect } from "./round-rect";

export function drawToilet(
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

  ctx.fillStyle = darkMode ? "#7a7a7a" : "#E8E8E8";
  roundRect(ctx, px + w * 0.15, py + h * 0.05, w * 0.7, h * 0.28, radius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = darkMode ? "#909090" : "#FFFFFF";
  roundRect(ctx, px + w * 0.1, py + h * 0.35, w * 0.8, h * 0.6, radius * 2.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = darkMode ? "#5a5a5a" : "#D8D8D8";
  roundRect(ctx, px + w * 0.2, py + h * 0.45, w * 0.6, h * 0.42, radius * 2);
  ctx.fill();
}
