import { Button, IconButton, SegmentedControl, Select } from "@mijime/theme/ui";
import { X } from "lucide-react";
import { useSaiflowDispatch, useSaiflowState } from "../store";
import { saveScenario } from "../storage";
import { DslEditor } from "./DslEditor";
import { GuiEditor } from "./GuiEditor";
import { AdvPlanner } from "./AdvPlanner";

export function EditorPanel({ onStartAdv }: { onStartAdv?: () => void }) {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();

  const hasParseErrors = !!state.parsed && "errors" in state.parsed;
  const showDsl = state.activeTab === "dsl" || hasParseErrors;
  const showGui = state.activeTab === "gui" && !hasParseErrors;
  const showAdv = state.activeTab === "adv" && !hasParseErrors;

  const copyScenario = async () => {
    const newName = `${state.scenarioName} (コピー)`;
    try {
      const id = await saveScenario({
        name: newName,
        dslText: state.dslText,
        currentAge: state.currentAge,
        simulationYears: state.simulationYears,
      });
      dispatch({ type: "SET_SCENARIO_ID", id });
      dispatch({ type: "SET_SCENARIO_NAME", name: newName });
      dispatch({ type: "SET_SAVE_STATUS", status: "saved", at: new Date(), error: null });
    } catch (error) {
      dispatch({
        type: "SET_SAVE_STATUS",
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-(--border)">
        <SegmentedControl
          ariaLabel="エディタ"
          value={hasParseErrors ? "dsl" : state.activeTab}
          onChange={(tab) => dispatch({ type: "SET_TAB", tab })}
          options={[
            { value: "gui", label: "GUI", disabled: hasParseErrors },
            { value: "dsl", label: "DSL" },
            { value: "adv", label: "ADV", disabled: hasParseErrors },
          ]}
        />
        <div className="ml-auto flex items-center gap-1">
          {state.scenarios.length > 1 && (
            <Select
              aria-label="シナリオ"
              className="w-auto px-1 py-0.5 text-xs"
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
            </Select>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label="この計画を複製"
            title="この計画を複製"
            onClick={() => void copyScenario()}
          >
            複製
          </Button>
          <IconButton
            label="エディタを閉じる"
            className="hidden md:inline-flex"
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          >
            <X size={14} />
          </IconButton>
        </div>
      </div>
      <div className={showAdv ? "flex-1 min-h-0" : "hidden"}>
        <AdvPlanner
          key={state.documentVersion}
          onComplete={() => dispatch({ type: "SET_TAB", tab: "gui" })}
          onStartNew={onStartAdv}
        />
      </div>
      {showDsl && <DslEditor />}
      {showGui && <GuiEditor />}
    </div>
  );
}
