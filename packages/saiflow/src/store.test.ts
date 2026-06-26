import { describe, it, expect } from "vitest";
import { reducer, initialState, type State, type Action } from "./store";

describe("reducer", () => {
  it("SET_DSL updates dslText", () => {
    const state = initialState();
    const next = reducer(state, { type: "SET_DSL", text: "hello" });
    expect(next.dslText).toBe("hello");
  });

  it("SET_AGE updates currentAge", () => {
    const state = initialState();
    const next = reducer(state, { type: "SET_AGE", age: 40 });
    expect(next.currentAge).toBe(40);
  });

  it("SET_YEARS updates simulationYears", () => {
    const state = initialState();
    const next = reducer(state, { type: "SET_YEARS", years: 60 });
    expect(next.simulationYears).toBe(60);
  });

  it("SET_TAB updates activeTab", () => {
    const state = initialState();
    const next = reducer(state, { type: "SET_TAB", tab: "gui" });
    expect(next.activeTab).toBe("gui");
  });

  it("SET_PARSED updates parsed", () => {
    const state = initialState();
    const next = reducer(state, {
      type: "SET_PARSED",
      parsed: { errors: [{ line: 1, message: "err" }] },
    });
    expect(next.parsed).toEqual({ errors: [{ line: 1, message: "err" }] });
  });

  it("SET_ROWS updates rows", () => {
    const state = initialState();
    const rows = [{ age: 40, operations: [], balances: {}, totalIncome: 0, totalExpense: 0, totalAssets: 0 }];
    const next = reducer(state, { type: "SET_ROWS", rows });
    expect(next.rows).toEqual(rows);
  });

  it("returns state unchanged for unknown action", () => {
    const state = initialState();
    const next = reducer(state, { type: "UNKNOWN" } as unknown as Action);
    expect(next).toBe(state);
  });
});
