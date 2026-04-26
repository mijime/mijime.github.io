import { roundRect } from "./roundRect";

export function drawChair(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  const lw = Math.max(1, w * 0.04);
  const legR = w * 0.07;

  // Seat cushion (top, flush to top edge)
  const seatTop = py;
  const seatH = h * 0.44;
  const seatL = px + w * 0.1;
  const seatW = w * 0.8;
  const seatR = w * 0.1;

  // 4 legs
  ctx.fillStyle = "#6B4A2A";
  for (const [lx, ly] of [
    [seatL + legR, seatTop + legR],
    [seatL + seatW - legR, seatTop + legR],
    [seatL + legR, seatTop + seatH - legR],
    [seatL + seatW - legR, seatTop + seatH - legR],
  ] as [number, number][]) {
    ctx.beginPath();
    ctx.arc(lx, ly, legR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#C4956A";
  roundRect(ctx, seatL, seatTop, seatW, seatH, seatR);
  ctx.fill();
  ctx.strokeStyle = "#8B6340";
  ctx.lineWidth = lw;
  roundRect(ctx, seatL, seatTop, seatW, seatH, seatR);
  ctx.stroke();

  // Backrest (directly below seat)
  const brH = h * 0.14;
  const brY = seatTop + seatH;
  ctx.fillStyle = "#7A5230";
  roundRect(ctx, px + w * 0.08, brY, w * 0.84, brH, lw * 1.5);
  ctx.fill();
  ctx.strokeStyle = "#5A3A1A";
  ctx.lineWidth = lw * 0.7;
  roundRect(ctx, px + w * 0.08, brY, w * 0.84, brH, lw * 1.5);
  ctx.stroke();
}
