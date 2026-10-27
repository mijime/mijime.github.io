import { useEffect, useRef } from "react";
import { parseDSL } from "./parser";
import { runSimulation, useSaiflowDispatch, useSaiflowState } from "./store";

/**
 * Keeps parsed scenarios, parse errors and simulation rows in sync with the
 * DSL text. This lives above the editors so switching tabs can never leave a
 * pending parse behind.
 */
export function useDslSync() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const text = state.dslText;

    if (text.trim().length === 0) {
      dispatch({ type: "SET_PARSED", parsed: null });
      dispatch({ type: "SET_ROWS", rows: null });
      dispatch({ type: "SET_SCENARIOS", scenarios: [] });
      dispatch({ type: "SET_ACTIVE_SCENARIO", index: 0 });
      // Keep the previous lastValidDsl so the user can restore it if they
      // accidentally cleared the editor.
      return;
    }

    const result = parseDSL(text);
    if (result.errors.length > 0) {
      dispatch({ type: "SET_PARSED", parsed: { errors: result.errors } });
      return;
    }

    dispatch({ type: "SET_LAST_VALID_DSL", text });

    const previous = stateRef.current;
    const previousName = previous.scenarios[previous.activeScenarioIndex]?.name;
    let index = previousName
      ? result.scenarios.findIndex((scenario) => scenario.name === previousName)
      : -1;
    if (index < 0) {
      index = Math.min(previous.activeScenarioIndex, result.scenarios.length - 1);
    }
    index = Math.max(0, index);

    dispatch({ type: "SET_SCENARIOS", scenarios: result.scenarios });
    dispatch({ type: "SET_ACTIVE_SCENARIO", index });
  }, [state.dslText, dispatch]);

  useEffect(() => {
    if (state.parsed && "errors" in state.parsed) return;
    const scenario = state.scenarios[state.activeScenarioIndex];
    if (!scenario) return;
    runSimulation(dispatch, state.currentAge, state.simulationYears, scenario, state.autoDrawdown);
  }, [
    state.scenarios,
    state.activeScenarioIndex,
    state.currentAge,
    state.simulationYears,
    state.autoDrawdown,
    state.estimateTaxes,
    dispatch,
  ]);
}
