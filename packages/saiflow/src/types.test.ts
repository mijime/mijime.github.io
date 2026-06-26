import { describe, it, expect } from "vitest";
import type { AssetOp, Event, SimulationConfig, YearRow } from "./types";

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

  it("SimulationConfig holds events and initial assets", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 50,
      initialAssets: [{ name: "現金", value: 1000 }],
      events: [],
    };
    expect(cfg.currentAge).toBe(39);
  });

  it("YearRow has balances snapshot", () => {
    const row: YearRow = {
      age: 40,
      operations: [],
      balances: { 現金: 800 },
      totalIncome: 500,
      totalExpense: 250,
      totalAssets: 800,
    };
    expect(row.balances["現金"]).toBe(800);
  });
});
