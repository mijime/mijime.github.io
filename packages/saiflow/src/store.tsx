import { createContext, useContext, useReducer, type Dispatch } from "react";
import type { ParseError, Scenario, YearRow } from "./types";

export interface State {
  dslText: string;
  currentAge: number;
  simulationYears: number;
  parsed: { config: { currentAge: number; simulationYears: number; scenario: Scenario } } | { errors: ParseError[] } | null;
  rows: YearRow[] | null;
  activeTab: "dsl" | "gui";
}

export type Action =
  | { type: "SET_DSL"; text: string }
  | { type: "SET_AGE"; age: number }
  | { type: "SET_YEARS"; years: number }
  | { type: "SET_TAB"; tab: "dsl" | "gui" }
  | { type: "SET_PARSED"; parsed: State["parsed"] }
  | { type: "SET_ROWS"; rows: YearRow[] | null };

export function initialState(): State {
  return {
    dslText: "",
    currentAge: 39,
    simulationYears: 50,
    parsed: null,
    rows: null,
    activeTab: "dsl",
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DSL":
      return { ...state, dslText: action.text };
    case "SET_AGE":
      return { ...state, currentAge: action.age };
    case "SET_YEARS":
      return { ...state, simulationYears: action.years };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_PARSED":
      return { ...state, parsed: action.parsed };
    case "SET_ROWS":
      return { ...state, rows: action.rows };
    default:
      return state;
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
