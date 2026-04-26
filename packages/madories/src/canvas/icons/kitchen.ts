import { roundRect } from "./roundRect";

export function drawKitchen(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  // Base
  ctx.fillStyle = "#F5DEB3";
  ctx.fillRect(px, py, w, h);
  ctx.strokeStyle = "#DAA520";
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.strokeRect(px, py, w, h);

  const third = w / 3;

  // Dividers
  ctx.strokeStyle = "#C8A400";
  ctx.lineWidth = 1;
  for (const dx of [third, third * 2]) {
    ctx.beginPath();
    ctx.moveTo(px + dx, py);
    ctx.lineTo(px + dx, py + h);
    ctx.stroke();
  }

  // --- left 1/3: sink ---
  const sinkPad = Math.min(third, h) * 0.08;
  const sinkW = third - sinkPad * 2;
  const sinkH = h * 0.72;
  const sinkX = px + sinkPad;
  const sinkY = py + (h - sinkH) / 2;
  ctx.fillStyle = "#B0E0E6";
  const r = Math.min(sinkW, sinkH) * 0.15;
  roundRect(ctx, sinkX, sinkY, sinkW, sinkH, r);
  ctx.fill();
  ctx.strokeStyle = "#4682B4";
  ctx.lineWidth = Math.max(1, w * 0.025);
  roundRect(ctx, sinkX, sinkY, sinkW, sinkH, r);
  ctx.stroke();
  ctx.fillStyle = "#4682B4";
  ctx.beginPath();
  ctx.arc(sinkX + sinkW / 2, sinkY + sinkH * 0.6, Math.min(sinkW, sinkH) * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8BAFC0";
  ctx.fillRect(sinkX + sinkW * 0.25, sinkY - sinkPad * 0.8, sinkW * 0.5, sinkPad * 0.9);

  // --- middle 1/3: empty ---

  // --- right 1/3: 3 burners (triangle: top-left, top-right, bottom-center) ---
  const stoveLeft = px + third * 2;
  const burnerR = Math.min(third, h) * 0.18;
  const cx = stoveLeft + third / 2;
  const burnerPositions: [number, number][] = [
    [cx - third * 0.22, py + h * 0.28],
    [cx + third * 0.22, py + h * 0.28],
    [cx, py + h * 0.72],
  ];
  for (const [bx, by] of burnerPositions) {
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(bx, by, burnerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = Math.max(1, burnerR * 0.3);
    ctx.beginPath();
    ctx.arc(bx, by, burnerR * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
}
