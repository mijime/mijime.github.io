import { roundRect } from "./roundRect";

export function drawWasher(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = "#F0F0F0";
  const r = Math.min(w, h) * 0.08;
  roundRect(ctx, px + w * 0.08, py + h * 0.08, w * 0.84, h * 0.84, r);
  ctx.fill();
  ctx.strokeStyle = "#AAA";
  ctx.lineWidth = 1;
  roundRect(ctx, px + w * 0.08, py + h * 0.08, w * 0.84, h * 0.84, r);
  ctx.stroke();

  // Drum circle
  const cx = px + w / 2;
  const cy = py + h * 0.58;
  const dr = Math.min(w, h) * 0.28;
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, dr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, dr * 0.4, 0, Math.PI * 2);
  ctx.stroke();

  // Control panel dots
  ctx.fillStyle = "#666";
  ctx.beginPath();
  ctx.arc(px + w * 0.3, py + h * 0.2, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + w * 0.55, py + h * 0.2, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
}
