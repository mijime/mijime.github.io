import { describe, it, expect } from "vitest";
import type { AssetOp, Event, Scenario, SimulationConfig, SqlResult, YearRow } from "./types";

describe("types", () => {
  it("AssetOp allows + - * ops", () => {
    const op: AssetOp = { asset: "現金", op: "+", value: 500 };
    expect(op.op).toBe("+");
  });

  it("Event with null endYear persists", () => {
    const ev: Event = {
      name: "生活費",
      startYear: 0,
      endYear: null,
      ops: [{ asset: "現金", op: "-", value: 250 }],
    };
    expect(ev.endYear).toBeNull();
  });

  it("SimulationConfig holds scenario", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 50,
      scenario: {
        name: "test",
        events: [],
      },
    };
    expect(cfg.currentAge).toBe(39);
    expect(cfg.scenario.name).toBe("test");
  });

  it("Scenario has name and events", () => {
    const s: Scenario = {
      name: "現状維持",
      events: [],
    };
    expect(s.name).toBe("現状維持");
  });

  it("SqlResult holds scenarios and errors", () => {
    const r: SqlResult = {
      scenarios: [],
      errors: [],
    };
    expect(r.scenarios).toHaveLength(0);
    expect(r.errors).toHaveLength(0);
  });

  it("YearRow has balances snapshot", () => {
    const row: YearRow = {
      age: 40,
      operations: [],
      balances: { 現金: 800 },
      totalIncome: 500,
      totalExpense: 250,
      totalAssets: 800,
      groupIncome: {},
      groupExpense: {},
    };
    expect(row.balances["現金"]).toBe(800);
  });
});
