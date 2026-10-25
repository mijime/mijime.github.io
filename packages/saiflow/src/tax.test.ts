import { describe, expect, it } from "vitest";
import {
  effectiveTaxRate,
  estimateIncomeTax,
  hasExplicitTaxEvent,
  isTaxableIncomeEvent,
} from "./tax";

describe("tax model", () => {
  it("uses a progressive effective rate", () => {
    expect(effectiveTaxRate(300)).toBe(0.15);
    expect(effectiveTaxRate(500)).toBe(0.18);
    expect(effectiveTaxRate(800)).toBe(0.22);
    expect(effectiveTaxRate(1200)).toBe(0.26);
  });

  it("estimates tax from gross income", () => {
    expect(estimateIncomeTax(500)).toBe(90);
    expect(estimateIncomeTax(800)).toBe(176);
    expect(estimateIncomeTax(0)).toBe(0);
  });

  it("only taxes salary-like events", () => {
    expect(isTaxableIncomeEvent("年収(夫)")).toBe(true);
    expect(isTaxableIncomeEvent("給与")).toBe(true);
    expect(isTaxableIncomeEvent("初期現金")).toBe(false);
    expect(isTaxableIncomeEvent("年金")).toBe(false);
  });

  it("detects explicit tax events without matching property tax", () => {
    expect(hasExplicitTaxEvent(["税金"])).toBe(true);
    expect(hasExplicitTaxEvent(["所得税"])).toBe(true);
    expect(hasExplicitTaxEvent(["税金(固定資産税)"])).toBe(false);
  });
});
