import { roundRect } from "./roundRect";

export function drawWashbasin(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  ctx.fillStyle = darkMode ? "#1a3a40" : "#B0E0E6";
  const radius = Math.min(w, h) * 0.1;
  roundRect(ctx, px + w * 0.1, py + h * 0.05, w * 0.8, h * 0.75, radius);
  ctx.fill();
  ctx.strokeStyle = darkMode ? "#2a5080" : "#4682B4";
  ctx.lineWidth = Math.max(1, w * 0.05);
  roundRect(ctx, px + w * 0.1, py + h * 0.05, w * 0.8, h * 0.75, radius);
  ctx.stroke();

  ctx.fillStyle = darkMode ? "#2a5080" : "#4682B4";
  ctx.beginPath();
  ctx.arc(px + w / 2, py + h * 0.43, Math.min(w, h) * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = darkMode ? "#3a6070" : "#8BAFC0";
  ctx.fillRect(px + w * 0.35, py + h * 0.02, w * 0.3, h * 0.1);
  ctx.strokeStyle = darkMode ? "#1a3040" : "#2D2520";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + w * 0.35, py + h * 0.02, w * 0.3, h * 0.1);
  ctx.beginPath();
  ctx.moveTo(px + w / 2, py + h * 0.12);
  ctx.lineTo(px + w / 2, py + h * 0.22);
  ctx.strokeStyle = darkMode ? "#1a3040" : "#2D2520";
  ctx.lineWidth = Math.max(1.5, w * 0.06);
  ctx.stroke();
}
