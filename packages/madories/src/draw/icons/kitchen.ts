import { roundRect } from "./roundRect";

export function drawKitchen(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const counterFill = darkMode ? "#7a6a4a" : "#EDE0C8";
  const counterStroke = darkMode ? "#9a8a5a" : "#C8A878";
  const sinkFill = darkMode ? "#5aaac0" : "#B8E8EE";
  const sinkStroke = darkMode ? "#7acce0" : "#4682B4";
  const drainFill = darkMode ? "#3a7090" : "#4682B4";
  const faucetFill = darkMode ? "#909090" : "#A0A8B0";
  const burnerOuter = darkMode ? "#5a5a5a" : "#C8C8C8";
  const burnerInner = darkMode ? "#8a4520" : "#8B4513";
  const burnerCenter = darkMode ? "#604010" : "#654321";
  const dividerStroke = darkMode ? "#8a7a50" : "#B89A60";

  const isLong = h > w * 2.5; // 1x3

  // Background
  ctx.fillStyle = counterFill;
  ctx.fillRect(px, py, w, h);
  ctx.strokeStyle = counterStroke;
  ctx.lineWidth = Math.max(1.5, w * 0.04);
  ctx.strokeRect(px + ctx.lineWidth / 2, py + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

  // Helper: draw burner
  function drawBurner(bx: number, by: number, r: number) {
    ctx.fillStyle = burnerOuter;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = burnerInner;
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = burnerCenter;
    ctx.lineWidth = Math.max(0.8, r * 0.28);
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Helper: draw sink+faucet in a region
  function drawSink(rx: number, ry: number, rw: number, rh: number) {
    const sW = rw * 0.72;
    const sH = rh * 0.62;
    const sX = rx + (rw - sW) / 2;
    const sY = ry + (rh - sH) / 2;
    const r = Math.min(sW, sH) * 0.18;

    ctx.fillStyle = sinkFill;
    roundRect(ctx, sX, sY, sW, sH, r);
    ctx.fill();
    ctx.strokeStyle = sinkStroke;
    ctx.lineWidth = Math.max(1, rw * 0.04);
    roundRect(ctx, sX, sY, sW, sH, r);
    ctx.stroke();

    // Drain
    ctx.fillStyle = drainFill;
    ctx.beginPath();
    ctx.arc(sX + sW / 2, sY + sH * 0.65, Math.min(sW, sH) * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Faucet stem
    const fW = Math.max(3, rw * 0.1);
    const fH = rh * 0.18;
    const fX = sX + (sW - fW) / 2;
    const fY = sY - fH * 0.5;
    ctx.fillStyle = faucetFill;
    roundRect(ctx, fX, fY, fW, fH, fW / 2);
    ctx.fill();
    ctx.strokeStyle = faucetFill;
    ctx.lineWidth = Math.max(2, rw * 0.07);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(fX + fW / 2, fY + fH * 0.8);
    ctx.lineTo(fX + fW / 2, sY + sH * 0.2);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  function drawDivider(y: number) {
    ctx.strokeStyle = dividerStroke;
    ctx.lineWidth = Math.max(1, w * 0.025);
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px + w, y);
    ctx.stroke();
  }

  if (isLong) {
    // 1x3: 上1/3=シンク、中1/3=カウンター、下1/3=コンロ3口三角
    const third = h / 3;
    const midRegionY = py + third;
    const stoveRegionY = py + third * 2;

    drawSink(px, py, w, third);
    drawDivider(midRegionY);

    // Counter middle: カウンター質感のみ
    ctx.fillStyle = darkMode ? "#6a5a3a" : "#E8D4B0";
    ctx.fillRect(px, midRegionY, w, third);

    drawDivider(stoveRegionY);

    // Stove: 3口三角 (上2口、下中央1口)
    const bR = Math.min(w * 0.2, third * 0.2);
    drawBurner(px + w * 0.28, stoveRegionY + third * 0.3, bR);
    drawBurner(px + w * 0.72, stoveRegionY + third * 0.3, bR);
    drawBurner(px + w * 0.5,  stoveRegionY + third * 0.72, bR);
  } else {
    // 1x2: 上半分=シンク、下半分=コンロ3口三角
    const half = h / 2;
    const stoveTop = py + half;

    drawSink(px, py, w, half);
    drawDivider(stoveTop);

    // Stove: 3口三角 (上2口、下中央1口)
    const bR = Math.min(w * 0.2, half * 0.2);
    drawBurner(px + w * 0.28, stoveTop + half * 0.3, bR);
    drawBurner(px + w * 0.72, stoveTop + half * 0.3, bR);
    drawBurner(px + w * 0.5,  stoveTop + half * 0.72, bR);
  }
}
