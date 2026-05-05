import { memo } from "react";
import type { Item, ItemType } from "../../../types";
import { ITEM_DEF_MAP } from "../../../items";
import { ITEM_COLORS, getItemHeightFactor } from "../materials";

const ITEM_MESH_SCALE = 0.9;

interface Props {
  x: number;
  y: number;
  cellSize: number;
  item: Item;
  darkMode: boolean;
}

export function getItemDrawOffset(
  w: number,
  h: number,
  rotation: 0 | 90 | 180 | 270,
): { offX: number; offY: number; effectiveW: number; effectiveH: number } {
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveW = isRotated ? h : w;
  const effectiveH = isRotated ? w : h;
  const asymmetric = w !== h;
  const offX = asymmetric && (rotation === 90 || rotation === 270) ? -(effectiveW - 1) || 0 : 0;
  const offY = asymmetric && (rotation === 180 || rotation === 270) ? -(effectiveH - 1) || 0 : 0;
  return { effectiveH, effectiveW, offX, offY };
}

function getItemColor(type: ItemType, darkMode: boolean): string {
  const entry = ITEM_COLORS[type];
  if (entry) {
    return darkMode ? entry.dark : entry.light;
  }
  return darkMode ? "#666666" : "#999999";
}

export const FurnitureMesh = memo(function FurnitureMesh({
  x,
  y,
  cellSize,
  item,
  darkMode,
}: Props) {
  const def = ITEM_DEF_MAP.get(item.type);
  if (!def) return null;

  const { effectiveW, effectiveH, offX, offY } = getItemDrawOffset(def.w, def.h, item.rotation);

  const drawX = x + offX;
  const drawY = y + offY;

  const width = effectiveW * cellSize;
  const depth = effectiveH * cellSize;
  const height = cellSize * getItemHeightFactor(item.type);

  const posX = drawX * cellSize + width / 2 - cellSize / 2;
  const posZ = drawY * cellSize + depth / 2 - cellSize / 2;

  const color = getItemColor(item.type, darkMode);

  return (
    <mesh position={[posX, height / 2, posZ]}>
      <boxGeometry args={[width * ITEM_MESH_SCALE, height, depth * ITEM_MESH_SCALE]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
});
