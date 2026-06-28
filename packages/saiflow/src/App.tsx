import { useEffect, useRef, useState } from "react";
import { SaiflowProvider, useSaiflowDispatch, useSaiflowState } from "./store";
import { ProfileBar } from "./components/ProfileBar";
import { EditorPanel } from "./components/EditorPanel";
import { ResultTable } from "./components/ResultTable";
import { BarChart } from "./components/BarChart";
import { LineChart } from "./components/LineChart";
import { listScenarios, saveScenario } from "./storage";

type ViewMode = "table" | "line" | "bar";

function RightPanel() {
  const [view, setView] = useState<ViewMode>("table");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-(--border)">
        {(["table", "line", "bar"] as ViewMode[]).map((v) => (
          <button
            key={v}
            className={`px-2 py-0.5 text-xs rounded ${view === v ? "bg-(--terra) text-white" : "text-(--ink) opacity-50"}`}
            onClick={() => setView(v)}
          >
            {v === "table" ? "収支表" : v === "line" ? "資産推移" : "収支比較"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "table" ? <ResultTable /> : view === "line" ? <LineChart /> : <BarChart />}
      </div>
    </div>
  );
}

function useAutoSave() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const loadedRef = useRef(false);

  useEffect(() => {
    listScenarios().then((scenarios) => {
      if (scenarios.length > 0) {
        const [s] = scenarios;
        dispatch({ type: "SET_DSL", text: s.dslText });
        dispatch({ type: "SET_AGE", age: s.currentAge });
        dispatch({ type: "SET_YEARS", years: s.simulationYears });
        dispatch({ type: "SET_SCENARIO_ID", id: s.id! });
        dispatch({ type: "SET_SCENARIO_NAME", name: s.name });
      }
      loadedRef.current = true;
    });
  }, [dispatch]);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const { scenarioId, scenarioName, dslText, currentAge, simulationYears } = stateRef.current;
      saveScenario({
        id: scenarioId ?? undefined,
        name: scenarioName,
        dslText,
        currentAge,
        simulationYears,
      }).then((id) => {
        if (scenarioId === null) {
          dispatch({ type: "SET_SCENARIO_ID", id });
        }
      });
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.dslText, state.currentAge, state.simulationYears, state.scenarioName, dispatch]);
}

function MainLayout() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();

  useAutoSave();

  return (
    <div className="h-full flex flex-col">
      <ProfileBar />
      <div className="flex-1 overflow-auto flex">
        {state.sidebarOpen && (
          <div className="w-96 flex-shrink-0 border-r border-(--border)">
            <EditorPanel />
          </div>
        )}
        {!state.sidebarOpen && (
          <button
            className="flex-shrink-0 px-1 border-r border-(--border) text-(--ink) opacity-50 hover:opacity-100 text-xs"
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          >
            ▸
          </button>
        )}
        <div className="flex-1">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <SaiflowProvider>
      <MainLayout />
    </SaiflowProvider>
  );
}
