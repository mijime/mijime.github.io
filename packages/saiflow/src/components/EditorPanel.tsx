import { useSaiflowDispatch, useSaiflowState } from "../store";
import { DslEditor } from "./DslEditor";

export function EditorPanel() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-(--border)">
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
      {state.activeTab === "dsl" ? (
        <DslEditor />
      ) : (
        <div className="p-4 text-sm text-(--ink) opacity-50">準備中</div>
      )}
    </div>
  );
}
