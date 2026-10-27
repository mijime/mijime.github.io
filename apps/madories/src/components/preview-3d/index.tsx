import { Component, type ReactNode } from "react";
import type { FloorPlan } from "../../types";
import type { CameraMode } from "./config";
import { FloorPlanScene } from "./scene";

interface Props {
  floors: FloorPlan[];
  cameraMode: CameraMode;
  move: React.MutableRefObject<{ x: number; z: number }>;
  cellSize: number; // 2D側との互換のため受け取るが3Dでは未使用
  darkMode: boolean;
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "grid", inset: 0, placeItems: "center", position: "absolute" }}>
          3Dプレビューの表示に失敗しました
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Preview3D({ floors, cameraMode, move, darkMode }: Props) {
  return (
    <SceneErrorBoundary>
      <FloorPlanScene floors={floors} cameraMode={cameraMode} move={move} darkMode={darkMode} />
    </SceneErrorBoundary>
  );
}
