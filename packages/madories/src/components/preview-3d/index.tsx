import type { FloorPlan } from "../../types";
import { FloorPlanScene } from "./scene";

interface Props {
  floor: FloorPlan;
  cellSize: number;
  darkMode: boolean;
}

export default function Preview3D({ floor, cellSize, darkMode }: Props) {
  return <FloorPlanScene floor={floor} cellSize={cellSize} darkMode={darkMode} />;
}
