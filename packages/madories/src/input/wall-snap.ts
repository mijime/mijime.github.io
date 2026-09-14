import type { EdgeRef } from "../types";

/**
 * Snaps a pointer position (array-space pixels) to the nearest world grid
 * vertex. The plane is unbounded, so there is no clamping; `originX/originY`
 * place the snap grid in world coordinates.
 */
export function snapVertex(
  mx: number,
  my: number,
  cellSize: number,
  originX = 0,
  originY = 0,
  step = 1,
): { vx: number; vy: number } {
  const snap = (v: number, origin: number) => {
    const snapped = Math.round((origin + v / cellSize) / step) * step;
    // Normalize -0 so callers can compare with === / toEqual cleanly.
    return snapped === 0 ? 0 : snapped;
  };
  return { vx: snap(mx, originX), vy: snap(my, originY) };
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
