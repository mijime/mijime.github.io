import { useEffect, useState } from "react";
import { Input } from "@mijime/theme/ui";
import { useSaiflowDispatch, useSaiflowState } from "../store";

export function ProfileBar() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();

  const [ageDraft, setAgeDraft] = useState(String(state.currentAge));
  const [yearsDraft, setYearsDraft] = useState(String(state.simulationYears));

  useEffect(() => {
    setAgeDraft(String(state.currentAge));
  }, [state.currentAge]);

  useEffect(() => {
    setYearsDraft(String(state.simulationYears));
  }, [state.simulationYears]);

  const commitAge = () => {
    const value = Number(ageDraft);
    if (Number.isFinite(value) && value > 0 && value < 120) {
      dispatch({ type: "SET_AGE", age: value });
    }
    setAgeDraft(String(state.currentAge));
  };

  const commitYears = () => {
    const value = Number(yearsDraft);
    if (Number.isFinite(value) && value > 0 && value <= 100) {
      dispatch({ type: "SET_YEARS", years: value });
    }
    setYearsDraft(String(state.simulationYears));
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="saiflow-current-age" className="flex items-center gap-1 text-sm">
        年齢
        <Input
          id="saiflow-current-age"
          type="number"
          className="w-16 py-0.5 tabular-nums"
          value={ageDraft}
          onChange={(e) => setAgeDraft(e.target.value)}
          onBlur={commitAge}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitAge();
          }}
        />
      </label>
      <label htmlFor="saiflow-years" className="flex items-center gap-1 text-sm">
        期間
        <Input
          id="saiflow-years"
          type="number"
          className="w-16 py-0.5 tabular-nums"
          value={yearsDraft}
          onChange={(e) => setYearsDraft(e.target.value)}
          onBlur={commitYears}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitYears();
          }}
        />
        <span className="text-xs opacity-50">年</span>
      </label>
    </div>
  );
}
