import { Maximize2, Minus, Plus } from "lucide-react";
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
    <div
      className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 p-2 rounded"
      style={{ background: "var(--toolbar-bg)", border: "1px solid var(--border)" }}
    >
      <button
        type="button"
        className="p-2 rounded transition"
        style={{ color: "var(--ink)" }}
        title="ズームイン"
        onClick={() =>
          dispatch({
            type: "SET_VIEW",
            view: { pan: state.view.pan, zoom: Math.min(3, zoom * 1.2) },
          })
        }
      >
        <Plus size={16} />
      </button>
      <button
        type="button"
        className="p-2 rounded transition"
        style={{ color: "var(--ink)" }}
        title="ズームアウト"
        onClick={() =>
          dispatch({
            type: "SET_VIEW",
            view: { pan: state.view.pan, zoom: Math.max(0.2, zoom / 1.2) },
          })
        }
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        className="p-2 rounded transition"
        style={{ color: "var(--ink)" }}
        title="全体表示"
        onClick={handleFitView}
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}
