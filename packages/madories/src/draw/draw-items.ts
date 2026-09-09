import { ITEM_DEF_MAP, getItemFootprint } from "../items";
import type { FloorPlan, Item } from "../types";
import { getCachedIcon } from "./icons/cache";

export function drawItemAt(
  ctx: CanvasRenderingContext2D,
  item: Item,
  px: number,
  py: number,
  cellSize: number,
  alpha = 1,
): void {
  const oc = getCachedIcon(item.type, item.rotation, cellSize);
  if (!oc) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(oc, px, py);
  ctx.restore();
}

export function drawItems(ctx: CanvasRenderingContext2D, floor: FloorPlan, cellSize: number): void {
  const { width, height, cells } = floor;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cells[y * width + x];
      if (!cell.item) {
        continue;
      }

      const itemDef = ITEM_DEF_MAP.get(cell.item.type);
      if (!itemDef) {
        continue;
      }

      const { effectiveW, effectiveH } = getItemFootprint(itemDef, cell.item.rotation);
      if (x + effectiveW > width || y + effectiveH > height) {
        continue;
      }

      drawItemAt(ctx, cell.item, x * cellSize, y * cellSize, cellSize);
    }
  }
}
