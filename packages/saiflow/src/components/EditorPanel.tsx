import { useSaiflowDispatch, useSaiflowState } from "../store";
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
            className={`px-3 py-1 text-sm ${state.activeTab === "dsl" ? "border-b border-(--ink)" : "opacity-50"}`}
            onClick={() => dispatch({ type: "SET_TAB", tab: "dsl" })}
          >
            DSL
          </button>
          <button
            className={`px-3 py-1 text-sm ${state.activeTab === "gui" ? "border-b border-(--ink)" : "opacity-50"}`}
            onClick={() => dispatch({ type: "SET_TAB", tab: "gui" })}
          >
            GUI
          </button>
        </div>
        {state.scenarios.length > 1 && (
          <select
            className="ml-auto mr-2 px-1 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded"
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
      </div>
      {state.activeTab === "dsl" ? <DslEditor /> : <GuiEditor />}
    </div>
  );
}
