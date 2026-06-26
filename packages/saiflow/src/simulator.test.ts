import { describe, it, expect } from "vitest";
import { simulate } from "./simulator";
import type { SimulationConfig } from "./types";

describe("simulate", () => {
  it("returns rows for each simulation year", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 3,
      scenario: {
        name: "test",
        events: [
          {
            name: "現金",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "+", value: 1000 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    expect(rows).toHaveLength(3);
    expect(rows[0].age).toBe(39);
    expect(rows[1].age).toBe(40);
    expect(rows[2].age).toBe(41);
  });

  it("carries balances across years", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 2,
      scenario: {
        name: "test",
        events: [
          {
            name: "現金",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "+", value: 1000 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    expect(rows[0].balances["現金"]).toBe(1000);
    expect(rows[1].balances["現金"]).toBe(1000);
  });

  it("applies + ops first, then - ops, then * ops", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 1,
      scenario: {
        name: "test",
        events: [
          {
            name: "現金",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "+", value: 1000 }],
          },
          {
            name: "収入",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "+", value: 500 }],
          },
          {
            name: "支出",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "-", value: 200 }],
          },
          {
            name: "運用",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "*", value: 1.03 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    // 1000 + 500 - 200 = 1300, then *1.03 = 1339
    expect(rows[0].balances["現金"]).toBeCloseTo(1339, 0);
    expect(rows[0].totalIncome).toBe(1500);
    expect(rows[0].totalExpense).toBe(200);
  });

  it("does not apply * to negative balances", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 1,
      scenario: {
        name: "test",
        events: [
          { name: "現金", startYear: 0, endYear: 0, ops: [{ asset: "現金", op: "+", value: 100 }] },
          {
            name: "大支出",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "-", value: 500 }],
          },
          {
            name: "運用",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "*", value: 1.03 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    expect(rows[0].balances["現金"]).toBe(-400);
  });

  it("handles event with endYear correctly", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 5,
      scenario: {
        name: "test",
        events: [
          {
            name: "収入",
            startYear: 0,
            endYear: 2,
            ops: [{ asset: "現金", op: "+", value: 100 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    // Years 0,1,2 should have income, years 3,4 should not
    expect(rows[0].totalIncome).toBe(100);
    expect(rows[1].totalIncome).toBe(100);
    expect(rows[2].totalIncome).toBe(100);
    expect(rows[3].totalIncome).toBe(0);
    expect(rows[4].totalIncome).toBe(0);
  });

  it("handles null endYear as persistent", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 3,
      scenario: {
        name: "test",
        events: [
          {
            name: "生活費",
            startYear: 0,
            endYear: null,
            ops: [{ asset: "現金", op: "-", value: 100 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    expect(rows[0].totalExpense).toBe(100);
    expect(rows[1].totalExpense).toBe(100);
    expect(rows[2].totalExpense).toBe(100);
  });

  it("handles multiple assets independently", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 1,
      scenario: {
        name: "test",
        events: [
          {
            name: "現金",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "+", value: 1000 }],
          },
          { name: "NISA", startYear: 0, endYear: 0, ops: [{ asset: "NISA", op: "+", value: 500 }] },
          {
            name: "積立",
            startYear: 0,
            endYear: 0,
            ops: [
              { asset: "現金", op: "-", value: 100 },
              { asset: "NISA", op: "+", value: 100 },
            ],
          },
          {
            name: "NISA運用",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "NISA", op: "*", value: 1.05 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    expect(rows[0].balances["現金"]).toBe(900);
    // 500 + 100 = 600, *1.05 = 630
    expect(rows[0].balances["NISA"]).toBeCloseTo(630, 0);
  });

  it("calculates totalAssets correctly", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 1,
      scenario: {
        name: "test",
        events: [
          {
            name: "現金",
            startYear: 0,
            endYear: 0,
            ops: [{ asset: "現金", op: "+", value: 1000 }],
          },
          { name: "NISA", startYear: 0, endYear: 0, ops: [{ asset: "NISA", op: "+", value: 500 }] },
        ],
      },
    };
    const rows = simulate(cfg);
    expect(rows[0].totalAssets).toBe(1500);
  });
});
