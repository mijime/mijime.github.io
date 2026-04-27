import { roundRect } from "./roundRect";

function drawDeskBase(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  inset: number,
  legFrac: number,
  lwFrac: number,
  grainCount: number,
  darkMode = false,
): void {
  const lw = Math.max(1, w * lwFrac);
  const legR = Math.min(w, h) * legFrac;
  const legOff = legR * (inset <= 0.05 ? 1.5 : 1.2);

  ctx.fillStyle = darkMode ? "#7a5830" : "#6B5030";
  for (const [lx, ly] of [
    [px + legOff, py + legOff],
    [px + w - legOff, py + legOff],
    [px + legOff, py + h - legOff],
    [px + w - legOff, py + h - legOff],
  ] as [number, number][]) {
    ctx.beginPath();
    ctx.arc(lx, ly, legR, 0, Math.PI * 2);
    ctx.fill();
  }

  const r = Math.min(w, h) * (inset <= 0.05 ? 0.04 : 0.06);
  const tw = 1 - inset * 2;
  ctx.fillStyle = darkMode ? "#b08a60" : "#D4B896";
  roundRect(ctx, px + w * inset, py + h * inset, w * tw, h * tw, r);
  ctx.fill();
  ctx.strokeStyle = darkMode ? "#8a6840" : "#8B7355";
  ctx.lineWidth = lw;
  roundRect(ctx, px + w * inset, py + h * inset, w * tw, h * tw, r);
  ctx.stroke();

  ctx.strokeStyle = darkMode ? "#c0a070" : "#C4A87A";
  ctx.lineWidth = Math.max(0.5, lw * 0.4);
  for (let i = 1; i <= grainCount; i++) {
    const gx = px + w * inset + w * tw * (i / (grainCount + 1));
    ctx.beginPath();
    ctx.moveTo(gx, py + h * (inset + 0.04));
    ctx.lineTo(gx, py + h * (1 - inset - 0.04));
    ctx.stroke();
  }
}

export function drawDesk(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  drawDeskBase(ctx, px, py, w, h, 0.06, 0.07, 0.04, 2, darkMode);
}

export function drawDeskLarge(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  drawDeskBase(ctx, px, py, w, h, 0.04, 0.05, 0.02, 3, darkMode);
}
