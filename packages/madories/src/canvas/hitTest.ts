export interface EdgeHit {
  cx: number;
  cy: number;
  edge: "top" | "left";
}

export function hitTestEdge(
  mx: number,
  my: number,
  cellSize: number,
  threshold = 6,
): EdgeHit | null {
  const cx = Math.floor(mx / cellSize);
  const cy = Math.floor(my / cellSize);
  const rx = mx % cellSize;
  const ry = my % cellSize;

  if (ry < threshold) {
    return { cx, cy, edge: "top" };
  }
  if (rx < threshold) {
    return { cx, cy, edge: "left" };
  }
  if (ry > cellSize - threshold) {
    return { cx, cy: cy + 1, edge: "top" };
  }
  if (rx > cellSize - threshold) {
    return { cx: cx + 1, cy, edge: "left" };
  }
  return null;
}
