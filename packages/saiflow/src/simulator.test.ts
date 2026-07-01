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
            startAge: 39,
            endAge: 39,
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
            startAge: 39,
            endAge: 39,
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
            startAge: 39,
            endAge: 39,
            ops: [{ asset: "現金", op: "+", value: 1000 }],
          },
          {
            name: "収入",
            startAge: 39,
            endAge: 39,
            ops: [{ asset: "現金", op: "+", value: 500 }],
          },
          {
            name: "支出",
            startAge: 39,
            endAge: 39,
            ops: [{ asset: "現金", op: "-", value: 200 }],
          },
          {
            name: "運用",
            startAge: 39,
            endAge: 39,
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

  it("applies * to negative balances", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 1,
      scenario: {
        name: "test",
        events: [
          { name: "現金", startAge: 39, endAge: 39, ops: [{ asset: "現金", op: "+", value: 100 }] },
          {
            name: "大支出",
            startAge: 39,
            endAge: 39,
            ops: [{ asset: "現金", op: "-", value: 500 }],
          },
          {
            name: "運用",
            startAge: 39,
            endAge: 39,
            ops: [{ asset: "現金", op: "*", value: 1.03 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    // -400 * 1.03 = -412
    expect(rows[0].balances["現金"]).toBeCloseTo(-412, 0);
  });

  it("handles event with endAge correctly", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 5,
      scenario: {
        name: "test",
        events: [
          {
            name: "収入",
            startAge: 39,
            endAge: 41,
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

  it("handles null endAge as persistent", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 3,
      scenario: {
        name: "test",
        events: [
          {
            name: "生活費",
            startAge: 39,
            endAge: null,
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
            startAge: 39,
            endAge: 39,
            ops: [{ asset: "現金", op: "+", value: 1000 }],
          },
          { name: "NISA", startAge: 39, endAge: 39, ops: [{ asset: "NISA", op: "+", value: 500 }] },
          {
            name: "積立",
            startAge: 39,
            endAge: 39,
            ops: [
              { asset: "現金", op: "-", value: 100 },
              { asset: "NISA", op: "+", value: 100 },
            ],
          },
          {
            name: "NISA運用",
            startAge: 39,
            endAge: 39,
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
            startAge: 39,
            endAge: 39,
            ops: [{ asset: "現金", op: "+", value: 1000 }],
          },
          { name: "NISA", startAge: 39, endAge: 39, ops: [{ asset: "NISA", op: "+", value: 500 }] },
        ],
      },
    };
    const rows = simulate(cfg);
    expect(rows[0].totalAssets).toBe(1500);
  });

  it("aggregates income and expense per group", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 2,
      scenario: {
        name: "test",
        events: [
          {
            name: "給料",
            group: "給与",
            startAge: 39,
            endAge: 40,
            ops: [{ asset: "現金", op: "+", value: 500 }],
          },
          {
            name: "ボーナス",
            group: "給与",
            startAge: 39,
            endAge: 39,
            ops: [{ asset: "現金", op: "+", value: 100 }],
          },
          {
            name: "家賃",
            group: "住宅",
            startAge: 39,
            endAge: null,
            ops: [{ asset: "現金", op: "-", value: 120 }],
          },
          {
            name: "その他",
            startAge: 39,
            endAge: null,
            ops: [{ asset: "現金", op: "-", value: 50 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    // Year 0: income 給与=600, expense 住宅=120, (未分類)=50
    expect(rows[0].groupIncome["給与"]).toBe(600);
    expect(rows[0].groupExpense["住宅"]).toBe(120);
    expect(rows[0].groupExpense["(未分類)"]).toBe(50);
    // Year 1: income 給与=500, expense 住宅=120, (未分類)=50
    expect(rows[1].groupIncome["給与"]).toBe(500);
    expect(rows[1].groupExpense["住宅"]).toBe(120);
    expect(rows[1].groupExpense["(未分類)"]).toBe(50);
  });

  it("handles events without a group under (未分類)", () => {
    const cfg: SimulationConfig = {
      currentAge: 39,
      simulationYears: 1,
      scenario: {
        name: "test",
        events: [
          {
            name: "雑収入",
            startAge: 39,
            endAge: 39,
            ops: [{ asset: "現金", op: "+", value: 100 }],
          },
        ],
      },
    };
    const rows = simulate(cfg);
    expect(rows[0].groupIncome["(未分類)"]).toBe(100);
  });
});
