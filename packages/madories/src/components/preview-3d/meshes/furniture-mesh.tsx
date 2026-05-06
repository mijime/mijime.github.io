import { memo } from "react";
import type { Item } from "../../../types";
import { ITEM_DEF_MAP } from "../../../items";

const ITEM_MESH_SCALE = 0.9;
const DEFAULT_HEIGHT_FACTOR = 0.8;
const DEFAULT_DEPTH_FACTOR = 1;

interface Props {
  x: number;
  y: number;
  cellSize: number;
  item: Item;
  darkMode: boolean;
}

export function getItemCenterPosition(
  drawX: number,
  drawY: number,
  effectiveW: number,
  effectiveH: number,
  cellSize: number,
): { posX: number; posZ: number } {
  const posX = (drawX + effectiveW / 2 - 0.5) * cellSize;
  const posZ = (drawY + effectiveH / 2 - 0.5) * cellSize;
  return { posX, posZ };
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

  const displayedW = item.rotation % 180 === 0 ? def.w : def.h;
  const displayedH = item.rotation % 180 === 0 ? def.h : def.w;

  const { posX, posZ } = getItemCenterPosition(x, y, displayedW, displayedH, cellSize);

  const width = def.w * cellSize * ITEM_MESH_SCALE;
  const depth = def.h * cellSize * ITEM_MESH_SCALE * (def.depthFactor ?? DEFAULT_DEPTH_FACTOR);
  const height = cellSize * (def.heightFactor ?? DEFAULT_HEIGHT_FACTOR);

  const color = darkMode ? def.color.dark : def.color.light;

  const rotation: [number, number, number] = [0, -item.rotation * (Math.PI / 180), 0];

  const parts = def.parts?.(cellSize, width, height, depth);
  if (parts) {
    return (
      <group position={[posX, 0, posZ]} rotation={rotation}>
        {parts.map((p, i) => (
          <mesh key={i} position={p.position}>
            <boxGeometry args={p.geometry} />
            <meshStandardMaterial color={p.color?.[darkMode ? "dark" : "light"] ?? color} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <mesh position={[posX, height / 2, posZ]} rotation={rotation}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
});
