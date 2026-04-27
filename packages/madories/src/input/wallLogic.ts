import { hitTestEdge } from "./hitTest";
import type { EdgeHit } from "./hitTest";

export function resolveWallSegments(
  mx: number,
  my: number,
  cellSize: number,
  lock: "top" | "left" | null,
  startPos: { mx: number; my: number } | null,
  lastPos: { mx: number; my: number } | null,
): EdgeHit[] {
  if (lock === "top") {
    const fixedCy = startPos ? Math.round(startPos.my / cellSize) : Math.round(my / cellSize);
    const cx = Math.floor(mx / cellSize);
    const lastCx = lastPos ? Math.floor(lastPos.mx / cellSize) : cx;
    const step = cx >= lastCx ? 1 : -1;
    const result: EdgeHit[] = [];
    for (let c = lastCx; c !== cx + step; c += step) {
      result.push({ cx: c, cy: fixedCy, edge: "top" });
    }
    return result;
  }

  if (lock === "left") {
    const fixedCx = startPos ? Math.round(startPos.mx / cellSize) : Math.round(mx / cellSize);
    const cy = Math.floor(my / cellSize);
    const lastCy = lastPos ? Math.floor(lastPos.my / cellSize) : cy;
    const step = cy >= lastCy ? 1 : -1;
    const result: EdgeHit[] = [];
    for (let c = lastCy; c !== cy + step; c += step) {
      result.push({ cx: fixedCx, cy: c, edge: "left" });
    }
    return result;
  }

  const hit = hitTestEdge(mx, my, cellSize);
  return hit ? [hit] : [];
}
