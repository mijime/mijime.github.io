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
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.strokeRect(px, py, w, h);

  const third = w / 3;

  ctx.strokeStyle = darkMode ? "#908020" : "#C8A400";
  ctx.lineWidth = 1;
  for (const dx of [third, third * 2]) {
    ctx.beginPath();
    ctx.moveTo(px + dx, py);
    ctx.lineTo(px + dx, py + h);
    ctx.stroke();
  }

  const sinkPad = Math.min(third, h) * 0.08;
  const sinkW = third - sinkPad * 2;
  const sinkH = h * 0.72;
  const sinkX = px + sinkPad;
  const sinkY = py + (h - sinkH) / 2;
  ctx.fillStyle = darkMode ? "#5aaac0" : "#B0E0E6";
  const r = Math.min(sinkW, sinkH) * 0.15;
  roundRect(ctx, sinkX, sinkY, sinkW, sinkH, r);
  ctx.fill();
  ctx.strokeStyle = darkMode ? "#7acce0" : "#4682B4";
  ctx.lineWidth = Math.max(1, w * 0.025);
  roundRect(ctx, sinkX, sinkY, sinkW, sinkH, r);
  ctx.stroke();
  ctx.fillStyle = darkMode ? "#5a90c0" : "#4682B4";
  ctx.beginPath();
  ctx.arc(sinkX + sinkW / 2, sinkY + sinkH * 0.6, Math.min(sinkW, sinkH) * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darkMode ? "#6aaac0" : "#8BAFC0";
  ctx.fillRect(sinkX + sinkW * 0.25, sinkY - sinkPad * 0.8, sinkW * 0.5, sinkPad * 0.9);

  const stoveLeft = px + third * 2;
  const burnerR = Math.min(third, h) * 0.18;
  const cx = stoveLeft + third / 2;
  const burnerPositions: [number, number][] = [
    [cx - third * 0.22, py + h * 0.28],
    [cx + third * 0.22, py + h * 0.28],
    [cx, py + h * 0.72],
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
