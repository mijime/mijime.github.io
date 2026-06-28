import { useSaiflowDispatch, useSaiflowState } from "../store";
import { saveScenario } from "../storage";
import { DslEditor } from "./DslEditor";
import { GuiEditor } from "./GuiEditor";

export function EditorPanel() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-(--border)">
        <div className="flex">
          <button
            className={`px-3 py-1 text-sm ${state.activeTab === "gui" ? "border-b border-(--ink)" : "opacity-50"}`}
            onClick={() => dispatch({ type: "SET_TAB", tab: "gui" })}
          >
            GUI
          </button>
          <button
            className={`px-3 py-1 text-sm ${state.activeTab === "dsl" ? "border-b border-(--ink)" : "opacity-50"}`}
            onClick={() => dispatch({ type: "SET_TAB", tab: "dsl" })}
          >
            DSL
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {state.scenarios.length > 1 && (
            <select
              className="px-1 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded"
              value={state.activeScenarioIndex}
              onChange={(e) =>
                dispatch({ type: "SET_ACTIVE_SCENARIO", index: Number(e.target.value) })
              }
            >
              {state.scenarios.map((s, i) => (
                <option key={i} value={i}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="px-2 py-1 text-xs opacity-50 hover:opacity-100"
            onClick={async () => {
              const newName = `${state.scenarioName} (コピー)`;
              const id = await saveScenario({
                name: newName,
                dslText: state.dslText,
                currentAge: state.currentAge,
                simulationYears: state.simulationYears,
              });
              dispatch({ type: "SET_SCENARIO_ID", id });
              dispatch({ type: "SET_SCENARIO_NAME", name: newName });
            }}
          >
            ⎘
          </button>
          <button
            className="px-2 py-1 text-sm opacity-50 hover:opacity-100"
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          >
            ×
          </button>
        </div>
      </div>
      {state.activeTab === "dsl" ? <DslEditor /> : <GuiEditor />}
    </div>
  );
}
