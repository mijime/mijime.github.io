import { roundRect } from "./roundRect";

export function drawBed(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  const radius = Math.min(w, h) * 0.08;
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = Math.max(1, w * 0.05);

  // Mattress
  ctx.fillStyle = "#F0EAE0";
  roundRect(ctx, px, py + h * 0.25, w, h * 0.75, radius);
  ctx.fill();
  ctx.stroke();

  // Pillow (top = head side)
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, px + w * 0.15, py + h * 0.28, w * 0.7, h * 0.18, radius);
  ctx.fill();
  ctx.stroke();

  // Headboard
  ctx.fillStyle = "#C8A87A";
  roundRect(ctx, px, py, w, h * 0.22, radius);
  ctx.fill();
  ctx.stroke();
}
