import { getItemFootprint, ITEM_DEF_MAP, ITEM_DEFS } from "../items";
import { arrayIndex, type WorldRect } from "../floor/frame";
import type { FloorPlan, Item } from "../types";

/** Largest footprint span (in cells) any item can occupy. */
let maxItemSpan = 1;
for (const def of ITEM_DEFS) {
  maxItemSpan = Math.max(maxItemSpan, def.w, def.h);
}
export const MAX_ITEM_SPAN = maxItemSpan;

export interface ItemAnchor {
  x: number;
  y: number;
  item: Item;
}

function footprint(ax: number, ay: number, item: Item): WorldRect | null {
  const def = ITEM_DEF_MAP.get(item.type);
  if (!def) {
    return null;
  }
  const { effectiveW, effectiveH } = getItemFootprint(def, item.rotation);
  return { maxX: ax + effectiveW - 1, maxY: ay + effectiveH - 1, minX: ax, minY: ay };
}

/**
 * Finds the item whose footprint covers the given world cell. The item is
 * stored on its top-left anchor cell, so without this a click on any other
 * part of the visible furniture would miss it.
 */
export function findItemAnchor(floor: FloorPlan, x: number, y: number): ItemAnchor | null {
  for (let dy = 0; dy < MAX_ITEM_SPAN; dy++) {
    for (let dx = 0; dx < MAX_ITEM_SPAN; dx++) {
      const ax = x - dx;
      const ay = y - dy;
      const idx = arrayIndex(floor, ax, ay);
      if (idx === null) {
        continue;
      }
      const item = floor.cells[idx].item;
      if (!item) {
        continue;
      }
      const box = footprint(ax, ay, item);
      if (box && dx < box.maxX - box.minX + 1 && dy < box.maxY - box.minY + 1) {
        return { item, x: ax, y: ay };
      }
    }
  }
  return null;
}

/**
 * Array indices of item anchors whose footprint intersects `rect`. Used by the
 * erase tools so erasing any furniture cell removes the whole item.
 */
export function anchorsIntersectingRect(floor: FloorPlan, rect: WorldRect): number[] {
  const out: number[] = [];
  const minX = rect.minX - (MAX_ITEM_SPAN - 1);
  const minY = rect.minY - (MAX_ITEM_SPAN - 1);
  for (let y = minY; y <= rect.maxY; y++) {
    for (let x = minX; x <= rect.maxX; x++) {
      const idx = arrayIndex(floor, x, y);
      if (idx === null) {
        continue;
      }
      const item = floor.cells[idx].item;
      if (!item) {
        continue;
      }
      const box = footprint(x, y, item);
      if (!box) {
        continue;
      }
      const intersects =
        box.minX <= rect.maxX &&
        box.maxX >= rect.minX &&
        box.minY <= rect.maxY &&
        box.maxY >= rect.minY;
      if (intersects) {
        out.push(idx);
      }
    }
  }
  return out;
}
