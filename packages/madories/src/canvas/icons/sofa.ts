export function drawSofa(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const backH = h * 0.25;
  const seatH = h * 0.45;
  const armW = w * 0.12;

  ctx.fillStyle = darkMode ? "#7a6e5e" : "#8B7D6B";
  ctx.fillRect(px, py, w, backH);

  ctx.fillStyle = darkMode ? "#6a5e4e" : "#7A6B5A";
  ctx.fillRect(px, py + backH, armW, seatH);
  ctx.fillRect(px + w - armW, py + backH, armW, seatH);

  ctx.fillStyle = darkMode ? "#8c7d6a" : "#A0907D";
  ctx.fillRect(px + armW, py + backH, w - armW * 2, seatH);

  ctx.strokeStyle = darkMode ? "#4a3828" : "#5C4A3A";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, w, backH + seatH);
  ctx.beginPath();
  ctx.moveTo(px, py + backH);
  ctx.lineTo(px + w, py + backH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px + armW, py + backH);
  ctx.lineTo(px + armW, py + backH + seatH);
  ctx.moveTo(px + w - armW, py + backH);
  ctx.lineTo(px + w - armW, py + backH + seatH);
  ctx.stroke();
}
