import { Maximize2, Minus, Plus } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";

export function ZoomControls() {
  const { state, dispatch } = useMindStore();
  const { zoom } = state.view;
  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
      <button
        type="button"
        className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
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
        className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
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
        className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        title="全体表示"
        onClick={() => dispatch({ type: "SET_VIEW", view: { pan: { x: 0, y: 0 }, zoom: 1 } })}
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}
