import { describe, expect, it } from "vitest";
import {
  getDueDecision,
  getNextDecisionAge,
  getPendingDecisions,
  retirementAskAge,
} from "./decisions";
import { emptyAdvFlags } from "./types";

describe("ADV decisions", () => {
  it("orders the initial decisions", () => {
    const pending = getPendingDecisions(35, 65, emptyAdvFlags());
    expect(pending.map((item) => [item.age, item.decision.kind])).toEqual([
      [35, "housing"],
      [36, "child1"],
      [37, "investment"],
      [38, "car"],
      [50, "retirement"],
      [60, "risk"],
    ]);
  });

  it("returns the due decision for the current age", () => {
    expect(getDueDecision(35, 65, 35, emptyAdvFlags())?.decision.kind).toBe("housing");
    const afterHousing = { ...emptyAdvFlags(), housing: { type: "rent" as const, monthly: 10 } };
    expect(getDueDecision(35, 65, 36, afterHousing)?.decision.kind).toBe("child1");
  });

  it("skips to the next decision age", () => {
    expect(getNextDecisionAge(35, 65, 35, emptyAdvFlags())).toBe(36);
    expect(getNextDecisionAge(35, 65, 40, emptyAdvFlags())).toBe(50);
  });

  it("adds school decisions for children", () => {
    const pending = getPendingDecisions(35, 65, {
      ...emptyAdvFlags(),
      child1Asked: true,
      child1: { birthAge: 36, schools: {} },
    });

    expect(
      pending.filter((item) => item.decision.kind === "school").map((item) => item.age),
    ).toEqual([39, 42, 48, 51, 54]);
    expect(pending.some((item) => item.decision.kind === "child2")).toBe(true);
  });

  it("does not ask about housing again after no change was chosen", () => {
    const pending = getPendingDecisions(35, 65, {
      ...emptyAdvFlags(),
      housingAsked: true,
    });
    expect(pending.some((item) => item.decision.kind === "housing")).toBe(false);
  });

  it("asks about retirement around age 50", () => {
    expect(retirementAskAge(35, 65)).toBe(50);
    expect(retirementAskAge(60, 65)).toBe(65);
  });
});
