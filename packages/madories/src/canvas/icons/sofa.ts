export function drawSofa(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode = false,
): void {
  const backW = w * 0.25;
  const seatW = w * 0.45;
  const armH = h * 0.12;

  ctx.fillStyle = darkMode ? "#7a6e5e" : "#8B7D6B";
  ctx.fillRect(px, py, backW, h);

  ctx.fillStyle = darkMode ? "#6a5e4e" : "#7A6B5A";
  ctx.fillRect(px + backW, py, seatW, armH);
  ctx.fillRect(px + backW, py + h - armH, seatW, armH);

  ctx.fillStyle = darkMode ? "#8c7d6a" : "#A0907D";
  ctx.fillRect(px + backW, py + armH, seatW, h - armH * 2);

  ctx.strokeStyle = darkMode ? "#4a3828" : "#5C4A3A";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, backW + seatW, h);
  ctx.beginPath();
  ctx.moveTo(px + backW, py);
  ctx.lineTo(px + backW, py + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px + backW, py + armH);
  ctx.lineTo(px + backW + seatW, py + armH);
  ctx.moveTo(px + backW, py + h - armH);
  ctx.lineTo(px + backW + seatW, py + h - armH);
  ctx.stroke();
}
