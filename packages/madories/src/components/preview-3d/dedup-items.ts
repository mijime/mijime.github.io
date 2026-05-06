import type { FloorPlan } from "../../types";
import { ITEM_DEF_MAP } from "../../items";

export function dedupFloorItems(
  floor: FloorPlan,
): { x: number; y: number; item: FloorPlan["cells"][number]["item"] }[] {
  const result: { x: number; y: number; item: FloorPlan["cells"][number]["item"] }[] = [];
  const visited = new Set<number>();
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const idx = y * floor.width + x;
      if (visited.has(idx)) continue;
      const cell = floor.cells[idx];
      if (!cell.item) continue;
      const def = ITEM_DEF_MAP.get(cell.item.type);
      if (!def) continue;
      result.push({ x, y, item: cell.item });
      const rotated = cell.item.rotation % 180 === 0;
      const effectiveW = rotated ? def.w : def.h;
      const effectiveH = rotated ? def.h : def.w;
      for (let dy = 0; dy < effectiveH; dy++) {
        for (let dx = 0; dx < effectiveW; dx++) {
          const cx = x + dx;
          const cy = y + dy;
          if (cx < floor.width && cy < floor.height) {
            visited.add(cy * floor.width + cx);
          }
        }
      }
    }
  }
  return result;
}
