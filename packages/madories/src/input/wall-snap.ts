import type { EdgeRef } from "../types";

export function snapVertex(
  mx: number,
  my: number,
  cellSize: number,
  width: number,
  height: number,
): { vx: number; vy: number } {
  const vx = Math.min(width, Math.max(0, Math.round(mx / cellSize)));
  const vy = Math.min(height, Math.max(0, Math.round(my / cellSize)));
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

export function nearestEdge(
  mx: number,
  my: number,
  cellSize: number,
  width: number,
  height: number,
): EdgeRef | null {
  const threshold = cellSize * 0.35;
  const distH = Math.abs(my - Math.round(my / cellSize) * cellSize);
  const distV = Math.abs(mx - Math.round(mx / cellSize) * cellSize);
  if (distH > threshold && distV > threshold) {
    return null;
  }
  if (distH <= distV) {
    const y = Math.min(height, Math.max(0, Math.round(my / cellSize)));
    const x = Math.min(width - 1, Math.max(0, Math.floor(mx / cellSize)));
    return { kind: "h", x, y };
  }
  const x = Math.min(width, Math.max(0, Math.round(mx / cellSize)));
  const y = Math.min(height - 1, Math.max(0, Math.floor(my / cellSize)));
  return { kind: "v", x, y };
}
