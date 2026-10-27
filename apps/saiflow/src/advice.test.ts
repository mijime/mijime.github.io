import { describe, expect, it } from "vitest";
import { buildAdvice } from "./advice";
import { simulate } from "./simulator";
import type { Event, Scenario, YearRow } from "./types";

function makeRow(age: number, overrides: Partial<YearRow> = {}): YearRow {
  return {
    age,
    operations: [],
    balances: { 現金: 100 },
    totalIncome: 0,
    totalExpense: 0,
    totalAssets: 100,
    groupIncome: {},
    groupExpense: {},
    ...overrides,
  };
}

function makeScenario(events: Event[] = []): Scenario {
  return { name: "test", events };
}

function findById(advice: ReturnType<typeof buildAdvice>, id: string) {
  return advice.find((item) => item.id === id);
}

describe("buildAdvice", () => {
  it("reports the age when net assets turn negative", () => {
    const rows = [
      makeRow(35, { totalAssets: 100 }),
      makeRow(36, { totalAssets: -50 }),
      makeRow(37, { totalAssets: 10 }),
    ];
    const advice = buildAdvice(rows, makeScenario(), 35);

    const item = findById(advice, "assets-negative");
    expect(item?.level).toBe("danger");
    expect(item?.title).toContain("36歳");
    expect(item?.detail).toContain("-50万円");
  });

  it("reports a healthy net worth as a positive finding", () => {
    const rows = [makeRow(35, { totalAssets: 100 }), makeRow(36, { totalAssets: 200 })];
    const advice = buildAdvice(rows, makeScenario(), 35);

    expect(findById(advice, "assets-positive")?.level).toBe("good");
  });

  it("warns when the loan is not paid off", () => {
    const rows = [
      makeRow(35, { balances: { 現金: 600, 借入: -500 }, totalAssets: 100 }),
      makeRow(36, { balances: { 現金: 600, 借入: -500 }, totalAssets: 100 }),
    ];
    const advice = buildAdvice(rows, makeScenario(), 35);

    const item = findById(advice, "loan-unpaid-借入");
    expect(item?.level).toBe("warning");
    expect(item?.detail).toContain("500万円");
  });

  it("recognises a paid-off loan", () => {
    const rows = [
      makeRow(35, { balances: { 現金: 600, 借入: -500 }, totalAssets: 100 }),
      makeRow(36, { balances: { 現金: 1100, 借入: 0 }, totalAssets: 1100 }),
    ];
    const advice = buildAdvice(rows, makeScenario(), 35);

    const item = findById(advice, "loan-paid-借入");
    expect(item?.level).toBe("good");
    expect(item?.title).toContain("36歳");
  });

  it("flags education costs peaking after income ends", () => {
    const events: Event[] = [
      {
        name: "給料",
        startAge: 35,
        endAge: 50,
        ops: [{ asset: "現金", op: "+", value: 800 }],
      },
      {
        name: "教育費(子)",
        startAge: 52,
        endAge: 55,
        ops: [{ asset: "現金", op: "-", value: 100 }],
      },
    ];
    const rows = Array.from({ length: 26 }, (_, i) => {
      const age = 35 + i;
      return makeRow(age, {
        totalIncome: age <= 50 ? 800 : 0,
        totalExpense: age >= 52 && age <= 55 ? 100 : 0,
        totalAssets: 1000,
        balances: { 現金: 1000 },
      });
    });
    const advice = buildAdvice(rows, makeScenario(events), 35);

    expect(findById(advice, "education-peak")?.title).toContain("52歳");
    expect(findById(advice, "education-after-income")?.level).toBe("warning");
    expect(findById(advice, "no-income")).toBeUndefined();
  });

  it("warns about an event with reversed ages", () => {
    const events: Event[] = [
      {
        name: "逆転",
        startAge: 60,
        endAge: 50,
        ops: [{ asset: "現金", op: "-", value: 10 }],
      },
    ];
    const advice = buildAdvice([makeRow(35)], makeScenario(events), 35);

    expect(findById(advice, "invalid-range-逆転")?.level).toBe("warning");
  });

  it("warns when cash is negative", () => {
    const rows = [makeRow(35, { balances: { 現金: -10 }, totalAssets: -10 })];
    const advice = buildAdvice(rows, makeScenario(), 35);

    expect(findById(advice, "cash-negative")?.level).toBe("danger");
  });

  it("warns when there is no income event", () => {
    const events: Event[] = [
      {
        name: "生活費",
        startAge: 35,
        endAge: null,
        ops: [{ asset: "現金", op: "-", value: 100 }],
      },
    ];
    const advice = buildAdvice(
      [makeRow(35, { totalExpense: 100, totalAssets: 100, balances: { 現金: 100 } })],
      makeScenario(events),
      35,
    );

    expect(findById(advice, "no-income")?.level).toBe("warning");
  });

  it("suggests reviewing a high cash ratio", () => {
    const rows = [
      makeRow(35, {
        balances: { 現金: 900, NISA: 100 },
        totalAssets: 1000,
      }),
    ];
    const advice = buildAdvice(rows, makeScenario(), 35);

    const item = findById(advice, "cash-heavy");
    expect(item?.level).toBe("info");
    expect(item?.title).toContain("90%");
  });

  it("warns when a non-cash asset becomes negative", () => {
    const rows = [
      makeRow(35, {
        balances: { 現金: 1000, NISA: -10 },
        totalAssets: 990,
      }),
    ];
    const advice = buildAdvice(rows, makeScenario(), 35);

    expect(findById(advice, "negative-asset-NISA")?.level).toBe("warning");
  });

  it("warns when the repayment ratio is high", () => {
    const events: Event[] = [
      {
        name: "借入返済",
        startAge: 35,
        endAge: 40,
        ops: [
          { asset: "現金", op: "-", value: 400 },
          { asset: "借入", op: "+", value: 400 },
        ],
      },
    ];
    const rows = [
      makeRow(35, {
        balances: { 現金: 600, 借入: -1000 },
        totalIncome: 800,
        totalAssets: 600,
      }),
      makeRow(36, {
        balances: { 現金: 600, 借入: -1000 },
        totalIncome: 800,
        totalAssets: 600,
      }),
    ];
    const advice = buildAdvice(rows, makeScenario(events), 35);

    expect(findById(advice, "housing-ratio-high")?.level).toBe("warning");
  });
});

describe("withdrawal advice", () => {
  it("reports automatic investment drawdown", () => {
    const rows = simulate({
      currentAge: 35,
      simulationYears: 2,
      autoDrawdown: true,
      scenario: {
        name: "test",
        events: [
          {
            name: "初期",
            startAge: 35,
            endAge: 35,
            ops: [
              { asset: "現金", op: "+", value: 100 },
              { asset: "NISA", op: "+", value: 500 },
            ],
          },
          {
            name: "生活費",
            startAge: 35,
            endAge: 35,
            ops: [{ asset: "現金", op: "-", value: 400 }],
          },
        ],
      },
    });
    const advice = buildAdvice(rows, makeScenario(), 35);
    const item = findById(advice, "drawdown-high") ?? findById(advice, "drawdown");
    expect(item).toBeDefined();
    expect(item?.detail).toContain("資産");
  });
});
