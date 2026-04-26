import { ITEM_DEF_MAP } from "../../items";
import type { ItemType } from "../../types";
import { ICON_REGISTRY } from "./index";

const cache = new Map<string, OffscreenCanvas>();

export function getCachedIcon(
  type: ItemType,
  rotation: 0 | 90 | 180 | 270,
  cellSize: number,
  darkMode = false,
): OffscreenCanvas | null {
  const def = ITEM_DEF_MAP.get(type);
  if (!def) {
    return null;
  }

  const key = `${type}:${rotation}:${cellSize}:${darkMode ? "d" : "l"}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }

  const isRotated = rotation === 90 || rotation === 270;
  const naturalW = def.w * cellSize;
  const naturalH = def.h * cellSize;
  const boundW = (isRotated ? def.h : def.w) * cellSize;
  const boundH = (isRotated ? def.w : def.h) * cellSize;

  const oc = new OffscreenCanvas(boundW, boundH);
  const ctx = oc.getContext("2d")!;
  ctx.translate(boundW / 2, boundH / 2);
  ctx.rotate((-rotation * Math.PI) / 180);

  const draw = ICON_REGISTRY.get(type);
  if (draw) {
    const pad = 2;
    draw(
      ctx,
      -naturalW / 2 + pad,
      -naturalH / 2 + pad,
      naturalW - 2 * pad,
      naturalH - 2 * pad,
      darkMode,
    );
  }

  cache.set(key, oc);
  return oc;
}

export function clearIconCache(): void {
  cache.clear();
}
