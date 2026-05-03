import type { FloorType } from "../../../types";
import { FLOOR_COLORS } from "../materials";

interface Props {
  cx: number;
  cy: number;
  cellSize: number;
  floorType: FloorType;
  darkMode: boolean;
}

export function FloorMesh({ cx, cy, cellSize, floorType, darkMode }: Props) {
  const worldX = cx * cellSize;
  const worldZ = cy * cellSize;
  const color = FLOOR_COLORS[floorType][darkMode ? "dark" : "light"];

  return (
    <mesh position={[worldX, 0, worldZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[cellSize, cellSize]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
