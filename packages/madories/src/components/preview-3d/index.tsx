import { Component, type ReactNode } from "react";
import type { FloorPlan } from "../../types";
import { FloorPlanScene } from "./scene";

interface Props {
  floors: FloorPlan[];
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

export default function Preview3D({ floors, darkMode }: Props) {
  return (
    <SceneErrorBoundary>
      <FloorPlanScene floors={floors} darkMode={darkMode} />
    </SceneErrorBoundary>
  );
}
