import { memo } from "react";
import type { WallType } from "../../../types";
import { WALL_COLORS, WALL_HEIGHT_FACTOR } from "../materials";

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
  const colorDef = WALL_COLORS[wallType];
  const color = colorDef[darkMode ? "dark" : "light"];
  const opacity = colorDef.opacity ?? 1;

  const worldX = cx * cellSize;
  const worldZ = cy * cellSize;

  if (wallType === "window_center") {
    const halfHeight = wallHeight / 2;
    const wallColor = WALL_COLORS.solid[darkMode ? "dark" : "light"];
    return (
      <group>
        {/* Upper wall */}
        <mesh
          position={[
            edge === "top" ? worldX : worldX - cellSize / 2,
            halfHeight + halfHeight / 2,
            edge === "top" ? worldZ - cellSize / 2 : worldZ,
          ]}
          rotation={[0, edge === "left" ? Math.PI / 2 : 0, 0]}
        >
          <planeGeometry args={[cellSize, halfHeight]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
        {/* Lower window */}
        <mesh
          position={[
            edge === "top" ? worldX : worldX - cellSize / 2,
            halfHeight / 2,
            edge === "top" ? worldZ - cellSize / 2 : worldZ,
          ]}
          rotation={[0, edge === "left" ? Math.PI / 2 : 0, 0]}
        >
          <planeGeometry args={[cellSize, halfHeight]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh
      position={[
        edge === "top" ? worldX : worldX - cellSize / 2,
        wallHeight / 2,
        edge === "top" ? worldZ - cellSize / 2 : worldZ,
      ]}
      rotation={[0, edge === "left" ? Math.PI / 2 : 0, 0]}
    >
      <planeGeometry args={[cellSize, wallHeight]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
});
