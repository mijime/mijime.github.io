import { Suspense } from "react";
import type { FloorPlan } from "../../types";
import { FloorPlanScene } from "./scene";

interface Props {
  floor: FloorPlan;
  cellSize: number;
  darkMode: boolean;
}

function Loader() {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "13px" }}>
        Loading 3D...
      </span>
    </div>
  );
}

export default function Preview3D({ floor, cellSize, darkMode }: Props) {
  return (
    <Suspense fallback={<Loader />}>
      <FloorPlanScene floor={floor} cellSize={cellSize} darkMode={darkMode} />
    </Suspense>
  );
}
