import { roundRect } from "./round-rect";

export function drawFridge(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const lw = Math.max(1, w * 0.04);
  const r = Math.min(w, h) * 0.07;

  ctx.fillStyle = darkMode ? "#7a7a7a" : "#E8E8E8";
  roundRect(ctx, px + w * 0.06, py + h * 0.06, w * 0.88, h * 0.88, r);
  ctx.fill();
  ctx.strokeStyle = darkMode ? "#aaaaaa" : "#AAAAAA";
  ctx.lineWidth = lw;
  roundRect(ctx, px + w * 0.06, py + h * 0.06, w * 0.88, h * 0.88, r);
  ctx.stroke();

  ctx.strokeStyle = darkMode ? "#888" : "#999";
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(px + w * 0.06, py + h * 0.06 + h * 0.88 * 0.35);
  ctx.lineTo(px + w * 0.94, py + h * 0.06 + h * 0.88 * 0.35);
  ctx.stroke();

  ctx.fillStyle = darkMode ? "#999" : "#BBBBBB";
  ctx.beginPath();
  ctx.arc(px + w * 0.12, py + h * 0.12, lw * 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = darkMode ? "#aaa" : "#888";
  ctx.lineWidth = lw * 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(px + w * 0.8, py + h * 0.13);
  ctx.lineTo(px + w * 0.8, py + h * 0.31);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(px + w * 0.8, py + h * 0.42);
  ctx.lineTo(px + w * 0.8, py + h * 0.85);
  ctx.stroke();
  ctx.lineCap = "butt";
}
