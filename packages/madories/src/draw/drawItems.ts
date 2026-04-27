import type { ItemDef } from "../items";
import { ITEM_DEF_MAP } from "../items";
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

export function getItemDrawOffset(
  def: ItemDef,
  rotation: 0 | 90 | 180 | 270,
): { offX: number; offY: number; effectiveW: number; effectiveH: number } {
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveW = isRotated ? def.h : def.w;
  const effectiveH = isRotated ? def.w : def.h;
  const asymmetric = def.w !== def.h;
  const offX = asymmetric && rotation === 90 ? -(effectiveW - 1) : 0;
  const offY = asymmetric && rotation === 180 ? -(effectiveH - 1) : 0;
  return { effectiveH, effectiveW, offX, offY };
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

      const { effectiveW, effectiveH, offX, offY } = getItemDrawOffset(itemDef, cell.item.rotation);
      const drawX = x + offX;
      const drawY = y + offY;

      if (drawX < 0 || drawY < 0 || drawX + effectiveW > width || drawY + effectiveH > height) {
        continue;
      }

      drawItemAt(ctx, cell.item, drawX * cellSize, drawY * cellSize, cellSize);
    }
  }
}

