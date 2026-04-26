import type { ItemDef } from "../items";
import { ITEM_DEF_MAP } from "../items";
import type { FloorPlan, Item, ItemType } from "../types";
import { ICON_REGISTRY } from "./icons/index";

export function drawItemAt(
  ctx: CanvasRenderingContext2D,
  item: Item,
  px: number,
  py: number,
  cellSize: number,
  alpha = 1,
  itemDef?: ItemDef,
): void {
  const def = itemDef ?? ITEM_DEF_MAP.get(item.type);
  if (!def) {
    return;
  }

  const isRotated = item.rotation === 90 || item.rotation === 270;
  const effectiveW = isRotated ? def.h : def.w;
  const effectiveH = isRotated ? def.w : def.h;
  const naturalW = def.w * cellSize;
  const naturalH = def.h * cellSize;
  const boundW = effectiveW * cellSize;
  const boundH = effectiveH * cellSize;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(px + boundW / 2, py + boundH / 2);
  ctx.rotate((-item.rotation * Math.PI) / 180);
  drawItemIcon(ctx, item.type, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
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
  const offX = asymmetric && (rotation === 180 || rotation === 270) ? -(effectiveW - 1) : 0;
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

      drawItemAt(ctx, cell.item, drawX * cellSize, drawY * cellSize, cellSize, 1, itemDef);
    }
  }
}

function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  type: ItemType,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  const pad = 2;
  const draw = ICON_REGISTRY.get(type);
  if (draw) {
    draw(ctx, px + pad, py + pad, w - 2 * pad, h - 2 * pad);
  }
}
