import { describe, expect, it } from "vitest";
import {
  adjustBaseForHousing,
  adjustBaseForRetirement,
  buildAdvEvents,
  buildAdvExtras,
  buildAdvHousing,
  buildAdvInvestment,
} from "./generator";
import { emptyAdvFlags, type AdvFlags, type AdvProfile } from "./types";

const profile: AdvProfile = {
  savings: 500,
  income: 500,
  livingMonthly: 15,
  rentMonthly: 10,
  pensionMonthly: 20,
};

function withFlags(overrides: Partial<AdvFlags>): AdvFlags {
  return { ...emptyAdvFlags(), ...overrides };
}

function byName(events: ReturnType<typeof buildAdvEvents>, name: string) {
  return events.find((event) => event.name === name);
}

describe("buildAdvEvents", () => {
  it("builds the base plan with rent", () => {
    const events = buildAdvEvents(
      profile,
      withFlags({ housing: { type: "rent", monthly: 10 } }),
      35,
    );

    expect(byName(events, "初期現金")?.ops[0].value).toBe(500);
    expect(byName(events, "年収")?.endAge).toBe(64);
    expect(byName(events, "生活費")?.ops[0].value).toBe(180);
    expect(byName(events, "生活費(退職後)")?.ops[0].value).toBe(153);
    expect(byName(events, "住居費(賃貸)")?.ops[0].value).toBe(120);
    expect(byName(events, "年金")?.ops[0].value).toBe(240);
  });

  it("builds a house purchase with a mortgage and property tax", () => {
    const events = buildAdvEvents(
      profile,
      withFlags({
        housing: {
          type: "buy",
          price: 4000,
          downPayment: 800,
          rate: 1.5,
          years: 35,
          annualTax: 16,
        },
      }),
      35,
    );

    expect(byName(events, "住宅(取得)")?.ops[0].value).toBe(4000);
    expect(byName(events, "頭金")?.ops[0].value).toBe(800);
    expect(byName(events, "借入実行")?.ops[0].value).toBe(3200);
    expect(byName(events, "借入返済")?.startAge).toBe(36);
    expect(byName(events, "税金(固定資産税)")?.ops[0].value).toBe(16);
    // The current year is still rented.
    expect(byName(events, "住居費(賃貸)")?.endAge).toBe(35);
  });

  it("builds education events from school choices", () => {
    const events = buildAdvEvents(
      profile,
      withFlags({
        child1: {
          birthAge: 36,
          schools: { 小学校: "private", 大学: "public" },
        },
      }),
      35,
    );

    const elementary = byName(events, "教育費(子1 小学校)");
    expect(elementary?.startAge).toBe(42);
    expect(elementary?.endAge).toBe(47);
    expect(elementary?.ops[0].value).toBe(167);

    const university = byName(events, "教育費(子1 大学)");
    expect(university?.startAge).toBe(54);
    expect(university?.ops[0].value).toBe(60);
  });

  it("updates income and investment when retiring early", () => {
    const events = buildAdvEvents(
      profile,
      withFlags({
        retirementAge: 60,
        investmentAsked: true,
        investmentMonthly: 5,
        investmentStartAge: 37,
      }),
      35,
    );

    expect(byName(events, "年収")?.endAge).toBe(59);
    expect(byName(events, "NISA積立")?.startAge).toBe(37);
    expect(byName(events, "NISA積立")?.endAge).toBe(59);
  });

  it("adds one-off income and expenses", () => {
    const events = buildAdvEvents(
      profile,
      withFlags({
        oneOffs: [
          { age: 38, name: "車", amount: -300 },
          { age: 40, name: "臨時収入", amount: 100 },
        ],
      }),
      35,
    );

    expect(byName(events, "車")?.ops[0]).toEqual({
      asset: "現金",
      op: "-",
      value: 300,
    });
    expect(byName(events, "臨時収入")?.ops[0]).toEqual({
      asset: "現金",
      op: "+",
      value: 100,
    });
  });
});

describe("buildAdvExtras", () => {
  it("adds only the selected future events", () => {
    const extras = buildAdvExtras(
      withFlags({
        child1: { birthAge: 36, schools: { 小学校: "public" } },
        car: { startAge: 38, mode: "buy" },
        risk: { illness: true, care: false },
      }),
      35,
      84,
    );
    const names = extras.map((event) => event.name);
    expect(names).toContain("教育費(子1 小学校)");
    expect(names).toContain("車購入");
    expect(names).toContain("大病");
    expect(names).not.toContain("初期現金");
    expect(names).not.toContain("年収");
    expect(names).not.toContain("年金");
  });
});

describe("ADV presets for later life", () => {
  it("splits living costs at retirement and adds a pension", () => {
    const events = buildAdvEvents(profile, withFlags({ retirementAge: 60 }), 35, 84);

    expect(byName(events, "年収")?.endAge).toBe(59);
    expect(byName(events, "生活費")?.endAge).toBe(59);
    expect(byName(events, "生活費(退職後)")?.startAge).toBe(60);
    expect(byName(events, "年金")?.startAge).toBe(65);
    expect(byName(events, "年金")?.ops[0].value).toBe(240);
  });

  it("adds car purchases and maintenance", () => {
    const events = buildAdvEvents(
      profile,
      withFlags({ carAsked: true, car: { startAge: 38, mode: "buy" } }),
      35,
      84,
    );

    const purchases = events.filter((event) => event.name === "車購入");
    expect(purchases.map((event) => event.startAge)).toEqual([38, 48, 58, 68, 78]);
    expect(byName(events, "車維持費")?.ops[0].value).toBe(24);
  });

  it("adds illness and care costs", () => {
    const events = buildAdvEvents(
      profile,
      withFlags({ riskAsked: true, risk: { illness: true, care: true } }),
      35,
      84,
    );

    expect(byName(events, "大病")?.startAge).toBe(60);
    expect(byName(events, "大病")?.ops[0].value).toBe(100);
    expect(byName(events, "介護一時費用")?.startAge).toBe(80);
    expect(
      events.filter((event) => event.name === "介護費用").map((event) => event.startAge),
    ).toEqual([80, 81, 82, 83, 84]);
  });
});

describe("append mode helpers", () => {
  it("builds a purchase and stops an existing rent", () => {
    const events = buildAdvHousing(
      {
        type: "buy",
        price: 4000,
        downPayment: 800,
        rate: 1.5,
        years: 35,
        annualTax: 16,
      },
      35,
    );
    expect(byName(events, "住宅(取得)")?.startAge).toBe(36);
    expect(byName(events, "頭金")?.ops[0].value).toBe(800);
    expect(byName(events, "住居費(賃貸)")).toBeUndefined();

    const adjusted = adjustBaseForHousing(
      [
        {
          name: "住居費(賃貸)",
          startAge: 35,
          endAge: null,
          ops: [{ asset: "現金", op: "-", value: 120 }],
        },
      ],
      36,
    );
    expect(adjusted[0].endAge).toBe(35);
  });

  it("stops salary income at the chosen retirement age", () => {
    const adjusted = adjustBaseForRetirement(
      [
        {
          name: "年収(夫)",
          startAge: 35,
          endAge: null,
          ops: [{ asset: "現金", op: "+", value: 500 }],
        },
        {
          name: "初期現金",
          startAge: 35,
          endAge: 35,
          ops: [{ asset: "現金", op: "+", value: 100 }],
        },
      ],
      55,
    );
    expect(adjusted[0].endAge).toBe(54);
    expect(adjusted[1].endAge).toBe(35);
  });

  it("adds investments from the current age", () => {
    const events = buildAdvInvestment(
      {
        ...emptyAdvFlags(),
        investmentMonthly: 5,
        investmentStartAge: 37,
        retirementAge: 60,
      },
      35,
    );
    expect(events[0].startAge).toBe(37);
    expect(events[0].endAge).toBe(59);
    expect(events[1].startAge).toBe(37);
  });
});
