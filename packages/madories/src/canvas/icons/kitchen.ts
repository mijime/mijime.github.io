import { roundRect } from "./roundRect";

export function drawKitchen(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  ctx.fillStyle = darkMode ? "#8a7040" : "#F5DEB3";
  ctx.fillRect(px, py, w, h);
  ctx.strokeStyle = darkMode ? "#aa9020" : "#DAA520";
  ctx.lineWidth = Math.max(1, h * 0.03);
  ctx.strokeRect(px, py, w, h);

  const third = h / 3;

  ctx.strokeStyle = darkMode ? "#908020" : "#C8A400";
  ctx.lineWidth = 1;
  for (const dy of [third, third * 2]) {
    ctx.beginPath();
    ctx.moveTo(px, py + dy);
    ctx.lineTo(px + w, py + dy);
    ctx.stroke();
  }

  const sinkPad = Math.min(w, third) * 0.08;
  const sinkW = w * 0.72;
  const sinkH = third - sinkPad * 2;
  const sinkX = px + (w - sinkW) / 2;
  const sinkY = py + sinkPad;
  ctx.fillStyle = darkMode ? "#5aaac0" : "#B0E0E6";
  const r = Math.min(sinkW, sinkH) * 0.15;
  roundRect(ctx, sinkX, sinkY, sinkW, sinkH, r);
  ctx.fill();
  ctx.strokeStyle = darkMode ? "#7acce0" : "#4682B4";
  ctx.lineWidth = Math.max(1, h * 0.025);
  roundRect(ctx, sinkX, sinkY, sinkW, sinkH, r);
  ctx.stroke();
  ctx.fillStyle = darkMode ? "#5a90c0" : "#4682B4";
  ctx.beginPath();
  ctx.arc(sinkX + sinkW / 2, sinkY + sinkH * 0.6, Math.min(sinkW, sinkH) * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darkMode ? "#6aaac0" : "#8BAFC0";
  ctx.fillRect(sinkX + sinkW * 0.25, sinkY - sinkPad * 0.8, sinkW * 0.5, sinkPad * 0.9);

  const stoveTop = py + third * 2;
  const burnerR = Math.min(w, third) * 0.18;
  const cx = px + w / 2;
  const cy = stoveTop + third / 2;
  const burnerPositions: [number, number][] = [
    [cx - w * 0.22, cy - third * 0.22],
    [cx + w * 0.22, cy - third * 0.22],
    [cx, cy + third * 0.22],
  ];
  for (const [bx, by] of burnerPositions) {
    ctx.fillStyle = darkMode ? "#8a4520" : "#8B4513";
    ctx.beginPath();
    ctx.arc(bx, by, burnerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = darkMode ? "#604010" : "#654321";
    ctx.lineWidth = Math.max(1, burnerR * 0.3);
    ctx.beginPath();
    ctx.arc(bx, by, burnerR * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
}
