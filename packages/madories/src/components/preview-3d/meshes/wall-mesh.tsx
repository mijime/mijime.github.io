import { memo } from "react";
import type { WallType } from "../../../types";
import { WALL_COLORS, WALL_HEIGHT_FACTOR, WALL_THICKNESS_FACTOR } from "../materials";

interface Props {
  cx: number;
  cy: number;
  cellSize: number;
  edge: "top" | "left";
  wallType: WallType;
  darkMode: boolean;
}

export const WallMesh = memo(function WallMesh({
  cx,
  cy,
  cellSize,
  edge,
  wallType,
  darkMode,
}: Props) {
  if (wallType === "none") return null;

  const wallHeight = cellSize * WALL_HEIGHT_FACTOR;
  const wallThickness = cellSize * WALL_THICKNESS_FACTOR;
  const colorDef = WALL_COLORS[wallType];
  const color = colorDef[darkMode ? "dark" : "light"];
  const opacity = colorDef.opacity ?? 1;

  const worldX = cx * cellSize;
  const worldZ = cy * cellSize;

  const basePosition: [number, number, number] = [
    edge === "top" ? worldX : worldX - cellSize / 2,
    wallHeight / 2,
    edge === "top" ? worldZ - cellSize / 2 : worldZ,
  ];

  if (wallType === "window_center") {
    const halfHeight = wallHeight / 2;
    const wallColor = WALL_COLORS.solid[darkMode ? "dark" : "light"];
    return (
      <group>
        {/* Upper wall */}
        <mesh
          position={[basePosition[0], halfHeight + halfHeight / 2, basePosition[2]]}
          rotation={[0, edge === "left" ? Math.PI / 2 : 0, 0]}
        >
          <boxGeometry args={[cellSize, halfHeight, wallThickness]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
        {/* Lower window */}
        <mesh
          position={[basePosition[0], halfHeight / 2, basePosition[2]]}
          rotation={[0, edge === "left" ? Math.PI / 2 : 0, 0]}
        >
          <boxGeometry args={[cellSize, halfHeight, wallThickness]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={basePosition} rotation={[0, edge === "left" ? Math.PI / 2 : 0, 0]}>
      <boxGeometry args={[cellSize, wallHeight, wallThickness]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
});
