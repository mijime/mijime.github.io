import type { FloorPlan, WallType } from "../types";

export function drawWalls(
  ctx: CanvasRenderingContext2D,
  floor: FloorPlan,
  cellSize: number,
  colors: { ink: string; windowBlue: string },
): void {
  const { width, height, cells } = floor;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cells[y * width + x];
      drawEdge(ctx, cell.wall.top, x * cellSize, y * cellSize, true, cellSize, colors);
      drawEdge(ctx, cell.wall.left, x * cellSize, y * cellSize, false, cellSize, colors);
    }
  }
}

// Ox,oy = origin corner; horizontal=true means top edge, false means left edge
function drawEdge(
  ctx: CanvasRenderingContext2D,
  type: WallType,
  ox: number,
  oy: number,
  horizontal: boolean,
  cellSize: number,
  colors: { ink: string; windowBlue: string },
): void {
  if (type === "none") {
    return;
  }

  // Endpoint of this edge
  const ex = horizontal ? ox + cellSize : ox;
  const ey = horizontal ? oy : oy + cellSize;

  // Lerp along edge
  const pt = (t: number) => ({
    x: ox + (ex - ox) * t,
    y: oy + (ey - oy) * t,
  });

  const line = (t0: number, t1: number) => {
    const a = pt(t0);
    const b = pt(t1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  const glass = (t0: number, t1: number) => {
    const a = pt(t0);
    const b = pt(t1);
    ctx.save();
    ctx.strokeStyle = colors.windowBlue;
    ctx.lineWidth = cellSize * 0.12;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  };

  switch (type) {
    case "solid": {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 3;
      line(0, 1);
      break;
    }

    case "solid_thin": {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.5;
      line(0, 1);
      break;
    }

    case "window_full": {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.5;
      line(0, 1);
      glass(0, 1);
      break;
    }

    case "window_center": {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 3;
      line(0, 0.25);
      line(0.75, 1);
      glass(0.25, 0.75);
      break;
    }
  }
}
