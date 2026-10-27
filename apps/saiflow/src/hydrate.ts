import type { Dispatch } from "react";
import { parseDSL } from "./parser";
import { simulate } from "./simulator";
import type { Action, State } from "./store";

export interface ScenarioStateOptions {
  name: string;
  currentAge: number;
  simulationYears: number;
  scenarioId: number | null;
  started: boolean;
  activeTab?: "dsl" | "gui" | "adv";
  activeScenarioIndex?: number;
  fromStorage?: boolean;
}

/**
 * Builds the state for a document loaded from DSL text.
 * On parse errors the document opens in the DSL tab, so the GUI never shows
 * stale scenario data that could overwrite the user's broken text.
 */
export function buildScenarioState(dslText: string, opts: ScenarioStateOptions): Partial<State> {
  const result = parseDSL(dslText);

  if (result.errors.length > 0) {
    return {
      dslText,
      lastValidDsl: "",
      currentAge: opts.currentAge,
      simulationYears: opts.simulationYears,
      parsed: { errors: result.errors },
      rows: null,
      scenarios: [],
      activeScenarioIndex: 0,
      activeTab: "dsl",
      scenarioId: opts.scenarioId,
      scenarioName: opts.name,
      started: opts.started,
      saveStatus: opts.fromStorage ? "saved" : "dirty",
      lastSavedAt: opts.fromStorage ? new Date() : null,
      saveError: null,
    };
  }

  const scenario = result.scenarios[0];
  const activeScenarioIndex = Math.min(
    Math.max(0, opts.activeScenarioIndex ?? 0),
    result.scenarios.length - 1,
  );
  const activeScenario = result.scenarios[activeScenarioIndex] ?? scenario;
  const rows = simulate({
    currentAge: opts.currentAge,
    simulationYears: opts.simulationYears,
    scenario: activeScenario,
  }).filter((r) => r.age >= opts.currentAge);

  return {
    dslText,
    lastValidDsl: dslText,
    currentAge: opts.currentAge,
    simulationYears: opts.simulationYears,
    parsed: {
      config: {
        currentAge: opts.currentAge,
        simulationYears: opts.simulationYears,
        scenario: activeScenario,
      },
    },
    rows,
    scenarios: result.scenarios,
    activeScenarioIndex,
    activeTab: opts.activeTab ?? "gui",
    scenarioId: opts.scenarioId,
    scenarioName: opts.name,
    started: opts.started,
    saveStatus: opts.fromStorage ? "saved" : "dirty",
    lastSavedAt: opts.fromStorage ? new Date() : null,
    saveError: null,
  };
}

export function hydrateFromDsl(
  dispatch: Dispatch<Action>,
  dslText: string,
  opts: ScenarioStateOptions,
) {
  dispatch({ type: "HYDRATE", patch: buildScenarioState(dslText, opts) });
}
