export function drawSofa(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  // Sofa pushed to top (back against wall), seat in lower portion
  const backH = h * 0.25;
  const seatH = h * 0.45;
  const armW = w * 0.12;

  // Back
  ctx.fillStyle = "#8B7D6B";
  ctx.fillRect(px, py, w, backH);

  // Arms (left & right)
  ctx.fillStyle = "#7A6B5A";
  ctx.fillRect(px, py + backH, armW, seatH);
  ctx.fillRect(px + w - armW, py + backH, armW, seatH);

  // Seat
  ctx.fillStyle = "#A0907D";
  ctx.fillRect(px + armW, py + backH, w - armW * 2, seatH);

  // Outline
  ctx.strokeStyle = "#5C4A3A";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, w, backH + seatH);
  // Back/seat divider
  ctx.beginPath();
  ctx.moveTo(px, py + backH);
  ctx.lineTo(px + w, py + backH);
  ctx.stroke();
  // Arm dividers
  ctx.beginPath();
  ctx.moveTo(px + armW, py + backH);
  ctx.lineTo(px + armW, py + backH + seatH);
  ctx.moveTo(px + w - armW, py + backH);
  ctx.lineTo(px + w - armW, py + backH + seatH);
  ctx.stroke();
}
