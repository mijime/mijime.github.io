import type { EdgeRef } from "../types";

export function snapVertex(
  mx: number,
  my: number,
  cellSize: number,
  width: number,
  height: number,
  step = 1,
): { vx: number; vy: number } {
  const quant = (v: number) => Math.round(v / step) * step;
  const vx = Math.min(width, Math.max(0, quant(mx / cellSize)));
  const vy = Math.min(height, Math.max(0, quant(my / cellSize)));
  return { vx, vy };
}

export function resolveEdges(
  start: { vx: number; vy: number },
  end: { vx: number; vy: number },
): EdgeRef[] {
  const dx = end.vx - start.vx;
  const dy = end.vy - start.vy;
  if (dx === 0 && dy === 0) {
    return [];
  }
  const edges: EdgeRef[] = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    const x0 = Math.min(start.vx, end.vx);
    for (let x = x0; x < x0 + Math.abs(dx); x++) {
      edges.push({ kind: "h", x, y: start.vy });
    }
  } else {
    const y0 = Math.min(start.vy, end.vy);
    for (let y = y0; y < y0 + Math.abs(dy); y++) {
      edges.push({ kind: "v", x: start.vx, y });
    }
  }
  return edges;
}
