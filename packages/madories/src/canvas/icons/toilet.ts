import { roundRect } from "./roundRect";

export function drawToilet(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  const radius = Math.min(w, h) * 0.08;
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = Math.max(1, w * 0.05);

  // Tank (wall side, top)
  ctx.fillStyle = "#E8E8E8";
  roundRect(ctx, px + w * 0.15, py + h * 0.05, w * 0.7, h * 0.28, radius);
  ctx.fill();
  ctx.stroke();

  // Bowl (front, bottom) - rounded rect for top-down view
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, px + w * 0.1, py + h * 0.35, w * 0.8, h * 0.6, radius * 2.5);
  ctx.fill();
  ctx.stroke();

  // Inner bowl opening
  ctx.fillStyle = "#D8D8D8";
  roundRect(ctx, px + w * 0.2, py + h * 0.45, w * 0.6, h * 0.42, radius * 2);
  ctx.fill();
}
