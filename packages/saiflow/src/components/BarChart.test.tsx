import { describe, it, expect } from "vitest";
import { logTicks } from "./BarChart";

describe("logTicks", () => {
  it("returns [1] for max=1", () => {
    expect(logTicks(1)).toEqual([1]);
  });

  it("returns [1, 10, 100] for max=100", () => {
    expect(logTicks(100)).toEqual([1, 10, 100]);
  });

  it("returns [1, 10, 100, 1000] for max=1000", () => {
    expect(logTicks(1000)).toEqual([1, 10, 100, 1000]);
  });

  it("returns [1, 10, 100, 1000] for max=1500 (stops before exceeding max)", () => {
    expect(logTicks(1500)).toEqual([1, 10, 100, 1000]);
  });

  it("handles max=0 by returning empty", () => {
    expect(logTicks(0)).toEqual([]);
  });

  it("returns [1, 10] for max=10", () => {
    expect(logTicks(10)).toEqual([1, 10]);
  });

  it("returns [1, 10, 100, 1000, 10000] for max=10000", () => {
    expect(logTicks(10_000)).toEqual([1, 10, 100, 1000, 10_000]);
  });
});

function logScale(v: number, max: number): number {
  return Math.log10(v + 1) / Math.log10(max + 1);
}

describe("log scale", () => {
  it("logScale(0, max) returns 0", () => {
    expect(logScale(0, 100_000)).toBe(0);
  });

  it("logScale(max, max) returns 1", () => {
    expect(logScale(100_000, 100_000)).toBeCloseTo(1);
  });

  it("logScale maps small values non-linearly", () => {
    const s10 = logScale(10, 100_000);
    const s100 = logScale(100, 100_000);
    // 100 should be further from 10 than in linear scale
    expect(s100 / s10).toBeGreaterThan(1);
  });
});
