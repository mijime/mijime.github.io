import { createContext, useContext, useReducer, type Dispatch } from "react";
import type { ParseError, Scenario, SimulationConfig, YearRow } from "./types";

export interface State {
  dslText: string;
  currentAge: number;
  simulationYears: number;
  parsed: { config: SimulationConfig } | { errors: ParseError[] } | null;
  rows: YearRow[] | null;
  activeTab: "dsl" | "gui";
  scenarios: Scenario[];
  activeScenarioIndex: number;
}

export type Action =
  | { type: "SET_DSL"; text: string }
  | { type: "SET_AGE"; age: number }
  | { type: "SET_YEARS"; years: number }
  | { type: "SET_TAB"; tab: "dsl" | "gui" }
  | { type: "SET_PARSED"; parsed: State["parsed"] }
  | { type: "SET_ROWS"; rows: YearRow[] | null }
  | { type: "SET_SCENARIOS"; scenarios: Scenario[] }
  | { type: "SET_ACTIVE_SCENARIO"; index: number };

export function initialState(): State {
  return {
    dslText: [
      "# 現状維持",
      "初期現金,0,0,現金+1000",
      "年収(夫),0,20,現金+500",
      "年収(妻),0,21,現金+300",
      "生活費,0,,現金-168",
      "住居費,0,0,現金-120",
      "頭金,1,1,現金-800",
      "借入実行,1,1,借入-3200",
      "借入返済,1,35,借入+156",
      "借入金利,1,35,借入*1.02",
      "住居費,1,,現金-30",
      "受験料(子1小),4,4,現金-10",
      "教育費(子1幼稚園),2,4,現金-30",
      "教育費(子1小学校),5,10,現金-20",
      "教育費(子1中学校),11,13,現金-30",
      "受験料(子1高),13,13,現金-10",
      "教育費(子1高校),14,16,現金-40",
      "受験料(子1大),16,16,現金-30",
      "教育費(子1大学),17,20,現金-120",
      "受験料(子2小),4,4,現金-10",
      "教育費(子2幼稚園),2,4,現金-30",
      "教育費(子2小学校),5,10,現金-20",
      "教育費(子2中学校),11,13,現金-30",
      "受験料(子2高),13,13,現金-10",
      "教育費(子2高校),14,16,現金-40",
      "受験料(子2大),16,16,現金-30",
      "教育費(子2大学),17,20,現金-120",
      "NISA積立,0,20,現金-40,NISA+40",
      "iDeCo積立,0,20,現金-28,iDeCo+28",
      "NISA運用,0,,NISA*1.03",
      "iDeCo運用,0,,iDeCo*1.03",
      "現金利息,0,,現金*1.01",
      "",
      "# 早期リタイア",
      "初期現金,0,0,現金+1000",
      "年収(夫),0,15,現金+500",
      "年収(妻),0,15,現金+300",
      "生活費,0,,現金-168",
      "住居費,0,,現金-120",
      "教育費(子1幼稚園),2,4,現金-50",
      "教育費(子1小学校),5,10,現金-40",
      "教育費(子1中学校),11,13,現金-60",
      "教育費(子1高校),14,16,現金-80",
      "教育費(子1大学),17,20,現金-200",
      "教育費(子2幼稚園),2,4,現金-50",
      "教育費(子2小学校),5,10,現金-40",
      "教育費(子2中学校),11,13,現金-60",
      "教育費(子2高校),14,16,現金-80",
      "教育費(子2大学),17,20,現金-200",
      "副業,16,,現金+100",
      "NISA積立,0,15,現金-40,NISA+40",
      "NISA運用,0,,NISA*1.05",
      "現金利息,0,,現金*1.01",
    ].join("\n"),
    currentAge: 39,
    simulationYears: 50,
    parsed: null,
    rows: null,
    activeTab: "dsl",
    scenarios: [],
    activeScenarioIndex: 0,
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DSL": {
      return { ...state, dslText: action.text };
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
      return { ...state, scenarios: action.scenarios, activeScenarioIndex: 0 };
    }
    case "SET_ACTIVE_SCENARIO": {
      return { ...state, activeScenarioIndex: action.index };
    }
    default: {
      return state;
    }
  }
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
