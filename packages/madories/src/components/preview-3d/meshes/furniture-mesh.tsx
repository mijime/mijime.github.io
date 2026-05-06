import { memo } from "react";
import type { Item, ItemType } from "../../../types";
import { ITEM_DEF_MAP } from "../../../items";
import {
  ITEM_COLORS,
  getItemDepthFactor,
  getItemHeightFactor,
  getItemPartColor,
} from "../materials";

const ITEM_MESH_SCALE = 0.9;

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

export function getItemDrawOffset(
  w: number,
  h: number,
  rotation: 0 | 90 | 180 | 270,
): { offX: number; offY: number; effectiveW: number; effectiveH: number } {
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveW = isRotated ? h : w;
  const effectiveH = isRotated ? w : h;
  const asymmetric = w !== h;
  const offX = asymmetric && rotation === 90 && effectiveW > 1 ? -(effectiveW - 1) : 0;
  const offY = asymmetric && rotation === 180 && effectiveH > 1 ? -(effectiveH - 1) : 0;
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

  const width = def.w * cellSize * ITEM_MESH_SCALE;
  const depth = def.h * cellSize * ITEM_MESH_SCALE * getItemDepthFactor(item.type);
  const height = cellSize * getItemHeightFactor(item.type);

  const { posX, posZ } = getItemCenterPosition(drawX, drawY, effectiveW, effectiveH, cellSize);

  const color = getItemColor(item.type, darkMode);
  const rotation: [number, number, number] = [0, -item.rotation * (Math.PI / 180), 0];

  if (item.type === "sofa") {
    const backColor = getItemPartColor("sofa", "back", darkMode);
    const seatColor = getItemPartColor("sofa", "seat", darkMode);
    const backrestW = width * 0.25;
    const seatW = width * 0.45;
    const backrestX = -width / 2 + backrestW / 2;
    const seatX = width / 2 - seatW / 2;
    return (
      <group position={[posX, 0, posZ]} rotation={rotation}>
        <mesh position={[backrestX, height * 0.6, 0]}>
          <boxGeometry args={[backrestW, height * 0.8, depth]} />
          <meshStandardMaterial color={backColor} />
        </mesh>
        <mesh position={[seatX, height * 0.2, 0]}>
          <boxGeometry args={[seatW, height * 0.4, depth]} />
          <meshStandardMaterial color={seatColor} />
        </mesh>
      </group>
    );
  }

  if (item.type === "desk") {
    const legColor = getItemPartColor("desk", "leg", darkMode);
    const topColor = getItemPartColor("desk", "top", darkMode);
    const legS = Math.min(width, depth) * 0.07;
    const legH = height * 0.75;
    const topH = height * 0.15;
    const inset = Math.min(width, depth) * 0.1;
    const legs = [
      [-width / 2 + inset, -depth / 2 + inset],
      [width / 2 - inset, -depth / 2 + inset],
      [-width / 2 + inset, depth / 2 - inset],
      [width / 2 - inset, depth / 2 - inset],
    ];
    return (
      <group position={[posX, 0, posZ]} rotation={rotation}>
        {legs.map(([lx, lz], i) => (
          <mesh key={i} position={[lx, legH / 2, lz]}>
            <boxGeometry args={[legS * 2, legH, legS * 2]} />
            <meshStandardMaterial color={legColor} />
          </mesh>
        ))}
        <mesh position={[0, legH + topH / 2, 0]}>
          <boxGeometry args={[width, topH, depth]} />
          <meshStandardMaterial color={topColor} />
        </mesh>
      </group>
    );
  }

  if (item.type === "washbasin_large") {
    const mirrorColor = getItemPartColor("washbasin_large", "mirror", darkMode);
    const counterColor = getItemPartColor("washbasin_large", "counter", darkMode);
    const mirrorW = width * 0.28;
    const counterW = width * 0.65;
    const mirrorX = -width / 2 + mirrorW / 2;
    const counterX = width / 2 - counterW / 2;
    return (
      <group position={[posX, 0, posZ]} rotation={rotation}>
        <mesh position={[mirrorX, height * 0.4, 0]}>
          <boxGeometry args={[mirrorW, height * 0.8, depth]} />
          <meshStandardMaterial color={mirrorColor} />
        </mesh>
        <mesh position={[counterX, height * 0.5, 0]}>
          <boxGeometry args={[counterW, height, depth]} />
          <meshStandardMaterial color={counterColor} />
        </mesh>
      </group>
    );
  }

  if (item.type === "tv") {
    const screenColor = getItemPartColor("tv", "screen", darkMode);
    const screenW = depth * 0.8;
    const screenH = height * 0.9;
    const screenD = depth * 0.15;
    return (
      <group position={[posX, 0, posZ]} rotation={rotation}>
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[width / 2 + screenD / 2, height / 2, 0]}>
          <boxGeometry args={[screenD, screenH, screenW]} />
          <meshStandardMaterial color={screenColor} />
        </mesh>
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
