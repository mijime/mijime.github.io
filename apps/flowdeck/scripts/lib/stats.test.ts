import { describe, expect, it } from "vitest";
import {
  bootstrapDifference,
  distribution,
  histogram,
  mean,
  median,
  pearson,
  quantile,
  spearman,
  stddev,
} from "./stats";

describe("stats", () => {
  it("nearest-rank の quantile を返す", () => {
    const values = [4, 1, 3, 2];
    expect(quantile(values, 0.5)).toBe(3);
    expect(quantile(values, 0.75)).toBe(4);
    expect(quantile([], 0.5)).toBe(0);
  });

  it("平均・中央値・標準偏差・分布を返す", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(stddev([1, 2, 3])).toBeCloseTo(1);
    expect(distribution([1, 2, 3]).median).toBe(2);
  });

  it("ヒストグラムの件数が入力と一致する", () => {
    const bins = histogram([1, 2, 3, 4, 5], 4);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(5);
  });

  it("相関を計算する", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(spearman([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1);
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });

  it("bootstrap の差は同じシードで再現する", () => {
    const a = bootstrapDifference([10, 11, 12], [8, 9, 10], mean, 100, 7);
    const b = bootstrapDifference([10, 11, 12], [8, 9, 10], mean, 100, 7);
    expect(a).toEqual(b);
    expect(a.delta).toBe(2);
  });
});
