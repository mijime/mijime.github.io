import { Maximize2, Minus, Plus } from "lucide-react";
import { Card, IconButton } from "@mijime/theme/ui";
import { useMindStore } from "../hooks/use-mind-store";
import { computeFitView } from "../view";

export function ZoomControls() {
  const { state, dispatch } = useMindStore();
  const { zoom } = state.view;

  function handleFitView() {
    const el = document.querySelector(".canvas-grid");
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const view = computeFitView(state.nodes, rect.width, rect.height);
    dispatch({ type: "SET_VIEW", view });
  }

  return (
    <Card tone="surface" padding="sm" className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
      <IconButton
        label="ズームイン"
        size="icon-sm"
        onClick={() =>
          dispatch({
            type: "SET_VIEW",
            view: { pan: state.view.pan, zoom: Math.min(3, zoom * 1.2) },
          })
        }
      >
        <Plus size={16} />
      </IconButton>
      <IconButton
        label="ズームアウト"
        size="icon-sm"
        onClick={() =>
          dispatch({
            type: "SET_VIEW",
            view: { pan: state.view.pan, zoom: Math.max(0.2, zoom / 1.2) },
          })
        }
      >
        <Minus size={16} />
      </IconButton>
      <IconButton label="全体表示" size="icon-sm" onClick={handleFitView}>
        <Maximize2 size={16} />
      </IconButton>
    </Card>
  );
}
