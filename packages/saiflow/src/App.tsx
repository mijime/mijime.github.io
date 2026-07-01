import { useEffect, useRef, useState } from "react";
import { SaiflowProvider, useSaiflowDispatch, useSaiflowState, type State } from "./store";
import { ProfileBar } from "./components/ProfileBar";
import { EditorPanel } from "./components/EditorPanel";
import { ResultTable } from "./components/ResultTable";
import { CategoryTable } from "./components/CategoryTable";
import { CategoryChart } from "./components/CategoryChart";
import { CashflowTable } from "./components/CashflowTable";
import { BarChart } from "./components/BarChart";
import { LineChart } from "./components/LineChart";
import { parseDSL } from "./parser";
import { listScenarios, saveScenario } from "./storage";

type ViewMode = "table" | "category" | "category-chart" | "cashflow" | "line" | "bar";

function RightPanel() {
  const [view, setView] = useState<ViewMode>("table");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-(--border) flex-wrap">
        {(
          [
            ["table", "収支表"],
            ["category", "内訳表"],
            ["category-chart", "内訳グラフ"],
            ["cashflow", "CF表"],
            ["line", "資産推移"],
            ["bar", "収支比較"],
          ] as [ViewMode, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            className={`px-2 py-0.5 text-xs rounded ${view === v ? "bg-(--terra) text-white" : "text-(--ink) opacity-50"}`}
            onClick={() => setView(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "table" ? (
          <ResultTable />
        ) : view === "category" ? (
          <CategoryTable />
        ) : view === "category-chart" ? (
          <CategoryChart />
        ) : view === "cashflow" ? (
          <CashflowTable />
        ) : view === "line" ? (
          <LineChart />
        ) : (
          <BarChart />
        )}
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
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
  const [initState, setInitState] = useState<Partial<State> | null>(null);

  useEffect(() => {
    listScenarios().then((scenarios) => {
      if (scenarios.length > 0) {
        const [s] = scenarios;
        const result = parseDSL(s.dslText);
        setInitState({
          dslText: s.dslText,
          currentAge: s.currentAge,
          simulationYears: s.simulationYears,
          scenarioId: s.id!,
          scenarioName: s.name,
          scenarios: result.scenarios.length > 0 ? result.scenarios : undefined,
        });
      } else {
        setInitState({});
      }
    });
  }, []);

  if (initState === null) return null;

  return (
    <SaiflowProvider state={initState}>
      <MainLayout />
    </SaiflowProvider>
  );
}
