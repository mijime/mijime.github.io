import { createContext, useContext, useReducer, type Dispatch } from "react";
import type { ParseError, Scenario, SimulationConfig, YearRow } from "./types";
import { simulate } from "./simulator";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface State {
  dslText: string;
  lastValidDsl: string;
  currentAge: number;
  simulationYears: number;
  parsed: { config: SimulationConfig } | { errors: ParseError[] } | null;
  rows: YearRow[] | null;
  activeTab: "dsl" | "gui" | "adv";
  scenarios: Scenario[];
  activeScenarioIndex: number;
  sidebarOpen: boolean;
  scenarioId: number | null;
  scenarioName: string;
  started: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  saveError: string | null;
  /** Sell investments automatically when cash is negative. */
  autoDrawdown: boolean;
  /** Estimate income tax and social insurance from gross salary. */
  estimateTaxes: boolean;
  /** Incremented whenever a different document is loaded. */
  documentVersion: number;
}

export type Action =
  | { type: "SET_DSL"; text: string }
  | { type: "SET_LAST_VALID_DSL"; text: string }
  | { type: "SET_AGE"; age: number }
  | { type: "SET_YEARS"; years: number }
  | { type: "SET_TAB"; tab: "dsl" | "gui" | "adv" }
  | { type: "SET_PARSED"; parsed: State["parsed"] }
  | { type: "SET_ROWS"; rows: YearRow[] | null }
  | { type: "SET_SCENARIOS"; scenarios: Scenario[] }
  | { type: "SET_ACTIVE_SCENARIO"; index: number }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_SCENARIO_ID"; id: number | null }
  | { type: "SET_SCENARIO_NAME"; name: string }
  | {
      type: "SET_SAVE_STATUS";
      status: SaveStatus;
      at?: Date | null;
      error?: string | null;
    }
  | { type: "SET_AUTO_DRAWDOWN"; value: boolean }
  | { type: "SET_ESTIMATE_TAXES"; value: boolean }
  | { type: "HYDRATE"; patch: Partial<State> };

export function initialState(): State {
  return {
    dslText: "",
    lastValidDsl: "",
    currentAge: 35,
    simulationYears: 50,
    parsed: null,
    rows: null,
    activeTab: "gui",
    scenarios: [],
    activeScenarioIndex: 0,
    sidebarOpen: true,
    scenarioId: null,
    scenarioName: "新規シナリオ",
    started: false,
    saveStatus: "idle",
    lastSavedAt: null,
    saveError: null,
    autoDrawdown: true,
    estimateTaxes: true,
    documentVersion: 0,
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DSL": {
      return { ...state, dslText: action.text };
    }
    case "SET_LAST_VALID_DSL": {
      return { ...state, lastValidDsl: action.text };
    }
    case "SET_AGE": {
      return { ...state, currentAge: action.age };
    }
    case "SET_YEARS": {
      return { ...state, simulationYears: action.years };
    }
    case "SET_TAB": {
      return { ...state, activeTab: action.tab };
    }
    case "SET_PARSED": {
      return { ...state, parsed: action.parsed };
    }
    case "SET_ROWS": {
      return { ...state, rows: action.rows };
    }
    case "SET_SCENARIOS": {
      return { ...state, scenarios: action.scenarios };
    }
    case "SET_ACTIVE_SCENARIO": {
      return { ...state, activeScenarioIndex: action.index };
    }
    case "TOGGLE_SIDEBAR": {
      return { ...state, sidebarOpen: !state.sidebarOpen };
    }
    case "SET_SCENARIO_ID": {
      return { ...state, scenarioId: action.id };
    }
    case "SET_SCENARIO_NAME": {
      return { ...state, scenarioName: action.name };
    }
    case "SET_SAVE_STATUS": {
      return {
        ...state,
        saveStatus: action.status,
        lastSavedAt: action.at === undefined ? state.lastSavedAt : action.at,
        saveError: action.error === undefined ? null : action.error,
      };
    }
    case "SET_AUTO_DRAWDOWN": {
      return { ...state, autoDrawdown: action.value };
    }
    case "SET_ESTIMATE_TAXES": {
      return { ...state, estimateTaxes: action.value };
    }
    case "HYDRATE": {
      return { ...state, ...action.patch, documentVersion: state.documentVersion + 1 };
    }
    default: {
      return state;
    }
  }
}

export function runSimulation(
  dispatch: Dispatch<Action>,
  currentAge: number,
  simulationYears: number,
  scenario: Scenario,
  autoDrawdown = true,
  estimateTaxes = false,
) {
  dispatch({
    type: "SET_PARSED",
    parsed: { config: { currentAge, simulationYears, scenario } },
  });
  const rows = simulate({
    currentAge,
    simulationYears,
    scenario,
    autoDrawdown,
    estimateTaxes,
  });
  const displayRows = rows.filter((r) => r.age >= currentAge);
  dispatch({ type: "SET_ROWS", rows: displayRows });
}

const StateCtx = createContext<State | null>(null);
const DispatchCtx = createContext<Dispatch<Action> | null>(null);

export function SaiflowProvider({
  children,
  state: init,
}: {
  children: React.ReactNode;
  state?: Partial<State>;
}) {
  const [state, dispatch] = useReducer(reducer, { ...initialState(), ...init });
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useSaiflowState(): State {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error("useSaiflowState must be inside SaiflowProvider");
  return ctx;
}

export function useSaiflowDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchCtx);
  if (!ctx) throw new Error("useSaiflowDispatch must be inside SaiflowProvider");
  return ctx;
}
