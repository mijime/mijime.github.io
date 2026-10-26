import { describe, expect, it } from "vitest";
import { computeCategories } from "./categories";
import { simulate } from "./simulator";

describe("computeCategories", () => {
  it("only aggregates cash income and expenses", () => {
    const rows = simulate({
      currentAge: 35,
      simulationYears: 1,
      scenario: {
        name: "test",
        events: [
          {
            name: "年収(夫)",
            startAge: 35,
            endAge: 35,
            ops: [{ asset: "現金", op: "+", value: 500 }],
          },
          {
            name: "生活費",
            startAge: 35,
            endAge: 35,
            ops: [{ asset: "現金", op: "-", value: 168 }],
          },
          {
            name: "NISA積立",
            startAge: 35,
            endAge: 35,
            ops: [
              { asset: "現金", op: "-", value: 40 },
              { asset: "NISA", op: "+", value: 40 },
            ],
          },
        ],
      },
    });

    const { allCategories, breakdowns } = computeCategories(rows);
    expect(allCategories).toContain("年収");
    expect(allCategories).toContain("生活費");
    expect(breakdowns[0].net["年収"]).toBe(500);
    expect(breakdowns[0].net["生活費"]).toBe(-168);
    expect(breakdowns[0].net["NISA積立"] ?? 0).toBe(0);
  });
});
