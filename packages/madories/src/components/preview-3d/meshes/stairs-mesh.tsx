import { memo, useMemo } from "react";
import type { Item } from "../../../types";
import { ITEM_DEF_MAP } from "../../../items";
import { ITEM_COLORS } from "../materials";

interface Props {
  x: number;
  y: number;
  cellSize: number;
  item: Item;
  darkMode: boolean;
}

const STAIRS_STEP_COUNT = 6;
const STAIRS_TOTAL_HEIGHT = 1.5;
const STAIRS_MESH_SCALE = 0.95;

function getItemColor(darkMode: boolean): string {
  const entry = ITEM_COLORS.stairs;
  return entry ? (darkMode ? entry.dark : entry.light) : (darkMode ? "#666666" : "#999999");
}

export const StairsMesh = memo(function StairsMesh({ x, y, cellSize, item, darkMode }: Props) {
  const steps = useMemo(() => {
    const def = ITEM_DEF_MAP.get(item.type);
    if (!def) return null;

    const isRotated = item.rotation === 90 || item.rotation === 270;
    const effectiveW = isRotated ? def.h : def.w;
    const effectiveH = isRotated ? def.w : def.h;

    const asymmetric = def.w !== def.h;
    const offX = asymmetric && item.rotation === 90 ? -(effectiveW - 1) : 0;
    const offY = asymmetric && item.rotation === 180 ? -(effectiveH - 1) : 0;
    const drawX = x + offX;
    const drawY = y + offY;

    const stepHeight = (cellSize * STAIRS_TOTAL_HEIGHT) / STAIRS_STEP_COUNT;
    const stepDepth = (cellSize * effectiveH) / STAIRS_STEP_COUNT;
    const stepWidth = cellSize * effectiveW;

    const color = getItemColor(darkMode);

    const stepElements = Array.from({ length: STAIRS_STEP_COUNT }, (_, i) => {
      const stepY = stepHeight * (i + 0.5);
      const stepZ = -(i * stepDepth - (cellSize * effectiveH) / 2 + stepDepth / 2);
      const stepX = 0;

      return (
        <mesh key={i} position={[stepX, stepY, stepZ]}>
          <boxGeometry
            args={[
              stepWidth * STAIRS_MESH_SCALE,
              stepHeight * STAIRS_MESH_SCALE,
              stepDepth * STAIRS_MESH_SCALE,
            ]}
          />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    });

    return { drawX, drawY, stepElements };
  }, [x, y, cellSize, item.rotation, darkMode]);

  if (!steps) return null;

  const posX = steps.drawX * cellSize;
  const posZ = steps.drawY * cellSize;

  return (
    <group position={[posX, 0, posZ]} rotation={[0, -item.rotation * (Math.PI / 180), 0]}>
      {steps.stepElements}
    </group>
  );
});
