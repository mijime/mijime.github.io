import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { createInitialState, reducer, type Action, type State } from "../store";

const MindContext = createContext<{ dispatch: Dispatch<Action>; state: State } | null>(null);

export function MindProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => initialState ?? createInitialState(),
  );
  return <MindContext.Provider value={{ dispatch, state }}>{children}</MindContext.Provider>;
}

export function useMindStore(): { dispatch: Dispatch<Action>; state: State } {
  const ctx = useContext(MindContext);
  if (!ctx) throw new Error("useMindStore must be used within MindProvider");
  return ctx;
}
