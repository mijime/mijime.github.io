import { memo, useMemo } from "react";
import type { Item } from "../../../types";
import { ITEM_DEF_MAP } from "../../../items";
import { ITEM_COLORS } from "../materials";
import { getItemCenterPosition, getItemDrawOffset } from "./furniture-mesh";

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

    const { effectiveW, effectiveH, offX, offY } = getItemDrawOffset(def.w, def.h, item.rotation);
    const drawX = x + offX;
    const drawY = y + offY;

    const stepHeight = (cellSize * STAIRS_TOTAL_HEIGHT) / STAIRS_STEP_COUNT;
    const stepWidth = cellSize * def.w;
    const stepDepth = (cellSize * def.h) / STAIRS_STEP_COUNT;
    const halfSpan = (cellSize * def.h) / 2;

    const color = getItemColor(darkMode);

    const stepElements = Array.from({ length: STAIRS_STEP_COUNT }, (_, i) => {
      const stepY = stepHeight * (i + 0.5);
      const stepZ = halfSpan - stepDepth / 2 - i * stepDepth;

      return (
        <mesh key={i} position={[0, stepY, stepZ]}>
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

    const { posX, posZ } = getItemCenterPosition(drawX, drawY, effectiveW, effectiveH, cellSize);

    return { posX, posZ, stepElements };
  }, [x, y, cellSize, item.rotation, item.type, darkMode]);

  if (!steps) return null;

  return (
    <group
      position={[steps.posX, 0, steps.posZ]}
      rotation={[0, -item.rotation * (Math.PI / 180), 0]}
    >
      {steps.stepElements}
    </group>
  );
});
