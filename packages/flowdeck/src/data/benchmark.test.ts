import { describe, expect, it } from "vitest";
import { benchmarkFor, scorePercentile } from "./benchmark";

describe("benchmark", () => {
  it("人数×日数の参考値を返す", () => {
    const entry = benchmarkFor(5, 10);
    expect(entry).not.toBeNull();
    expect(entry?.runs).toBe(1000);
    expect(entry?.swing).toBe(0.1);
    expect(entry?.score.p10).toBeLessThanOrEqual(entry?.score.median ?? 0);
    expect(entry?.score.median).toBeLessThanOrEqual(entry?.score.p90 ?? 0);
  });

  it("存在しない条件は null", () => {
    expect(benchmarkFor(3, 10)).toBeNull();
  });

  it("得損の振れ幅ごとに参考値を持つ", () => {
    expect(benchmarkFor(5, 10, 0)?.swing).toBe(0);
    expect(benchmarkFor(5, 10, 0.2)?.swing).toBe(0.2);
    expect(benchmarkFor(5, 10, 0.2)?.score.median).not.toBe(benchmarkFor(5, 10, 0)?.score.median);
  });

  it("スコアのpercentileを補間する", () => {
    const entry = benchmarkFor(5, 10);
    if (!entry) throw new Error("benchmark missing");
    expect(scorePercentile(entry, entry.score.median)).toBeCloseTo(0.5);
    expect(scorePercentile(entry, entry.score.p90)).toBeCloseTo(0.9);
    expect(scorePercentile(entry, -100)).toBe(0.1);
  });
});
