import { useSaiflowDispatch, useSaiflowState } from "../store";

export function ProfileBar() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();

  return (
    <div className="flex gap-4 p-2 border-b border-(--border)">
      <label className="flex items-center gap-1 text-sm">
        年齢
        <input
          type="number"
          className="w-16 px-1 py-0.5 border border-(--border) bg-(--paper) text-(--ink) rounded"
          value={state.currentAge}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v > 0 && v < 120) dispatch({ type: "SET_AGE", age: v });
          }}
        />
      </label>
      <label className="flex items-center gap-1 text-sm">
        期間
        <input
          type="number"
          className="w-16 px-1 py-0.5 border border-(--border) bg-(--paper) text-(--ink) rounded"
          value={state.simulationYears}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v > 0 && v <= 100) dispatch({ type: "SET_YEARS", years: v });
          }}
        />
        <span className="text-xs opacity-50">年</span>
      </label>
    </div>
  );
}
