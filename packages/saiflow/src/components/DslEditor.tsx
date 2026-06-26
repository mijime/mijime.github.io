import { useEffect, useRef } from "react";
import { useSaiflowDispatch, useSaiflowState } from "../store";
import { parseDSL } from "../parser";
import { simulate } from "../simulator";

export function DslEditor() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (state.dslText.trim().length === 0) {
      dispatch({ type: "SET_PARSED", parsed: null });
      dispatch({ type: "SET_ROWS", rows: null });
      return;
    }
    const result = parseDSL(state.dslText);
    if (result.errors.length > 0) {
      dispatch({ type: "SET_PARSED", parsed: { errors: result.errors } });
      dispatch({ type: "SET_ROWS", rows: null });
    } else if (result.scenarios.length > 0) {
      const scenario = result.scenarios[0];
      dispatch({
        type: "SET_PARSED",
        parsed: {
          config: {
            currentAge: state.currentAge,
            simulationYears: state.simulationYears,
            scenario,
          },
        },
      });
      const rows = simulate({
        currentAge: state.currentAge,
        simulationYears: state.simulationYears,
        scenario,
      });
      dispatch({ type: "SET_ROWS", rows });
    } else {
      dispatch({ type: "SET_PARSED", parsed: null });
      dispatch({ type: "SET_ROWS", rows: null });
    }
  }, [state.dslText, state.currentAge, state.simulationYears, dispatch]);

  const handleChange = (text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dispatch({ type: "SET_DSL", text });
    }, 300);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b border-(--border)">
        <span className="text-xs text-(--ink) opacity-60">DSL</span>
        {state.parsed && "errors" in state.parsed && (
          <span className="text-xs text-red-500">エラーあり</span>
        )}
        {state.parsed && "config" in state.parsed && (
          <span className="text-xs text-green-500">解析OK</span>
        )}
      </div>
      <textarea
        className="flex-1 w-full p-2 font-mono text-sm bg-(--paper) text-(--ink) resize-none outline-none"
        defaultValue={state.dslText}
        placeholder={`# 現状維持\n現金,0,0,現金+1000\n年収(夫),0,25,現金+500\n生活費,0,,現金-250`}
        onInput={(e) => handleChange(e.currentTarget.value)}
        spellCheck={false}
      />
      {state.parsed && "errors" in state.parsed && (
        <div className="p-2 border-t border-(--border) text-xs text-red-500 max-h-32 overflow-y-auto">
          {state.parsed.errors.map((e, i) => (
            <div key={i}>
              L{e.line}: {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
