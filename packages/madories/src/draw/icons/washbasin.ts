import { roundRect } from "./roundRect";

export function drawWashbasin(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const ink = darkMode ? "#3a6070" : "#2D2520";
  const basinFill = darkMode ? "#5aaac0" : "#B0E0E6";
  const basinStroke = darkMode ? "#7acce0" : "#4682B4";
  const drainFill = darkMode ? "#3a7090" : "#4682B4";
  const faucetFill = darkMode ? "#909090" : "#A0A8B0";
  // eslint-disable-next-line oxc/branches-sharing-code
  if (h > w * 1.5) {
    // 1x2 縦長: 左=鏡、右=カウンター+ボウル+蛇口 (横分割)
    const mirrorFill = darkMode ? "#1a3a4a" : "#E8F4F8";
    const mirrorFrame = darkMode ? "#4a6a7a" : "#8AAABB";
    const counterFill = darkMode ? "#6a5a40" : "#EAD8C0";
    const counterStroke = darkMode ? "#8a7a50" : "#C8A880";

    // Counter background (right ~65%)
    const divX = px + w * 0.35;
    const counterW = w - (divX - px);
    ctx.fillStyle = counterFill;
    ctx.fillRect(divX, py, counterW, h);
    ctx.strokeStyle = counterStroke;
    ctx.lineWidth = Math.max(1, h * 0.02);
    ctx.strokeRect(divX, py + ctx.lineWidth / 2, counterW - ctx.lineWidth / 2, h - ctx.lineWidth);

    // Divider edge line
    ctx.strokeStyle = counterStroke;
    ctx.lineWidth = Math.max(1.5, h * 0.025);
    ctx.beginPath();
    ctx.moveTo(divX, py);
    ctx.lineTo(divX, py + h);
    ctx.stroke();

    // Mirror (left ~50%, inset)
    const mPad = h * 0.04;
    const mirrorX = px + w * 0.03;
    const mirrorY = py + mPad;
    const mirrorW = w * 0.28;
    const mirrorH = h - mPad * 2;
    const mR = Math.min(mirrorW, mirrorH) * 0.05;

    ctx.fillStyle = mirrorFill;
    roundRect(ctx, mirrorX, mirrorY, mirrorW, mirrorH, mR);
    ctx.fill();
    ctx.strokeStyle = mirrorFrame;
    ctx.lineWidth = Math.max(2, h * 0.025);
    roundRect(ctx, mirrorX, mirrorY, mirrorW, mirrorH, mR);
    ctx.stroke();

    // Mirror reflection highlight
    ctx.strokeStyle = darkMode ? "#3a6a7a" : "#C8E8F0";
    ctx.lineWidth = Math.max(1, h * 0.015);
    roundRect(ctx, mirrorX + w * 0.03, mirrorY + h * 0.04, mirrorW * 0.4, mirrorH * 0.5, mR * 0.5);
    ctx.stroke();

    // Basin (oval, centered in counter area)
    const bW = counterW * 0.72;
    const bH = h * 0.38;
    const bX = divX + (counterW - bW) / 2;
    const bY = py + (h - bH) / 2;
    const bR = Math.min(bW, bH) * 0.35;

    ctx.fillStyle = basinFill;
    roundRect(ctx, bX, bY, bW, bH, bR);
    ctx.fill();
    ctx.strokeStyle = basinStroke;
    ctx.lineWidth = Math.max(1, h * 0.025);
    roundRect(ctx, bX, bY, bW, bH, bR);
    ctx.stroke();

    // Drain
    ctx.fillStyle = drainFill;
    ctx.beginPath();
    ctx.arc(bX + bW / 2, bY + bH * 0.62, Math.min(bW, bH) * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Faucet (horizontal lever above basin)
    const fH2 = Math.max(3, h * 0.06);
    const fW2 = counterW * 0.5;
    const fX2 = divX + (counterW - fW2) / 2;
    const fY2 = bY - fH2 * 1.2;
    ctx.fillStyle = faucetFill;
    roundRect(ctx, fX2, fY2, fW2, fH2, fH2 / 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.8;
    roundRect(ctx, fX2, fY2, fW2, fH2, fH2 / 2);
    ctx.stroke();

    // Spout drop
    ctx.strokeStyle = faucetFill;
    ctx.lineWidth = Math.max(2, h * 0.04);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bX + bW / 2, fY2 + fH2);
    ctx.lineTo(bX + bW / 2, bY + bH * 0.2);
    ctx.stroke();
  } else {
    // 1x1
    const basinX = px + w * 0.1;
    const basinY = py + h * 0.18;
    const basinW = w * 0.8;
    const basinH = h * 0.72;
    const r = Math.min(basinW, basinH) * 0.12;

    ctx.fillStyle = basinFill;
    roundRect(ctx, basinX, basinY, basinW, basinH, r);
    ctx.fill();
    ctx.strokeStyle = basinStroke;
    ctx.lineWidth = Math.max(1, w * 0.05);
    roundRect(ctx, basinX, basinY, basinW, basinH, r);
    ctx.stroke();

    ctx.fillStyle = drainFill;
    ctx.beginPath();
    ctx.arc(px + w / 2, basinY + basinH * 0.55, basinW * 0.1, 0, Math.PI * 2);
    ctx.fill();

    const fBarW = w * 0.32;
    const fBarH = Math.max(3, h * 0.08);
    const fBarX = px + (w - fBarW) / 2;
    const fBarY = py + h * 0.04;
    ctx.fillStyle = faucetFill;
    roundRect(ctx, fBarX, fBarY, fBarW, fBarH, fBarH / 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    roundRect(ctx, fBarX, fBarY, fBarW, fBarH, fBarH / 2);
    ctx.stroke();

    ctx.strokeStyle = faucetFill;
    ctx.lineWidth = Math.max(2, w * 0.07);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px + w / 2, fBarY + fBarH);
    ctx.lineTo(px + w / 2, basinY + basinH * 0.2);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}
