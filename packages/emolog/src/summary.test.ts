import { describe, expect, it } from "vitest";
import { computeSummary, getDateRangeForPeriod } from "./summary";
import type { Entry } from "./types";

function e(emoji: string, overrides: Partial<Entry> = {}): Entry {
  return {
    date: "2026-07-15",
    timestamp: 0,
    emoji,
    ...overrides,
  };
}

describe("computeSummary", () => {
  it("empty entries returns zero total, zero distinct, empty rankings", () => {
    const result = computeSummary([]);
    expect(result.total).toBe(0);
    expect(result.distinct).toBe(0);
    expect(result.rankings).toEqual([]);
  });

  it("single entry returns one total, one distinct, 100%", () => {
    const result = computeSummary([e("😊")]);
    expect(result.total).toBe(1);
    expect(result.distinct).toBe(1);
    expect(result.rankings).toEqual([{ emoji: "😊", count: 1, pct: 100 }]);
  });

  it("multiple same emoji aggregates correctly", () => {
    const result = computeSummary([e("😊"), e("😊"), e("😊")]);
    expect(result.total).toBe(3);
    expect(result.distinct).toBe(1);
    expect(result.rankings).toEqual([{ emoji: "😊", count: 3, pct: 100 }]);
  });

  it("multiple distinct emoji with different counts", () => {
    const result = computeSummary([e("😊"), e("😊"), e("😢"), e("😊"), e("😢")]);
    expect(result.total).toBe(5);
    expect(result.distinct).toBe(2);
    expect(result.rankings).toEqual([
      { emoji: "😊", count: 3, pct: 60 },
      { emoji: "😢", count: 2, pct: 40 },
    ]);
  });

  it("equal counts are ordered deterministically by emoji code point", () => {
    const result = computeSummary([e("😢"), e("😊")]);
    expect(result.rankings).toEqual([
      { emoji: "😊", count: 1, pct: 50 },
      { emoji: "😢", count: 1, pct: 50 },
    ]);
  });

  it("percentage rounds to one decimal", () => {
    const result = computeSummary([e("😊"), e("😊"), e("😢")]);
    expect(result.total).toBe(3);
    expect(result.rankings[0].pct).toBe(66.7);
    expect(result.rankings[1].pct).toBe(33.3);
  });

  it("percentage is 0 when total is 0", () => {
    const result = computeSummary([]);
    const allZero = result.rankings.every((r) => r.pct === 0);
    expect(allZero).toBe(true);
  });
});

describe("getDateRangeForPeriod", () => {
  it('returns null for "all" period', () => {
    expect(getDateRangeForPeriod("all")).toBeNull();
  });

  it("7d period ends today and starts 6 days before", () => {
    const range = getDateRangeForPeriod("7d");
    expect(range).not.toBeNull();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(range!.to).toBe(todayStr);

    const expectedFrom = new Date(today);
    expectedFrom.setDate(expectedFrom.getDate() - 6);
    const fromStr = `${expectedFrom.getFullYear()}-${String(expectedFrom.getMonth() + 1).padStart(2, "0")}-${String(expectedFrom.getDate()).padStart(2, "0")}`;
    expect(range!.from).toBe(fromStr);
  });

  it("30d period starts 29 days before today", () => {
    const range = getDateRangeForPeriod("30d");
    expect(range).not.toBeNull();
    const today = new Date();
    const expectedFrom = new Date(today);
    expectedFrom.setDate(expectedFrom.getDate() - 29);
    const fromStr = `${expectedFrom.getFullYear()}-${String(expectedFrom.getMonth() + 1).padStart(2, "0")}-${String(expectedFrom.getDate()).padStart(2, "0")}`;
    expect(range!.from).toBe(fromStr);
  });
});
