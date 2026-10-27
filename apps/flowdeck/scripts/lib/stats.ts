export type Statistic = (values: number[]) => number;

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function mean(values: number[]): number {
  return values.length > 0 ? sum(values) / values.length : 0;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** 既存の sim 出力と同じ nearest-rank。 */
export function quantile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index] ?? 0;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(sum(values.map((value) => (value - average) ** 2)) / (values.length - 1));
}

export interface Distribution {
  n: number;
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  max: number;
  mean: number;
  stddev: number;
}

export function distribution(values: number[]): Distribution {
  return {
    n: values.length,
    min: values.length > 0 ? Math.min(...values) : 0,
    p10: quantile(values, 0.1),
    p25: quantile(values, 0.25),
    median: median(values),
    p75: quantile(values, 0.75),
    p90: quantile(values, 0.9),
    p95: quantile(values, 0.95),
    max: values.length > 0 ? Math.max(...values) : 0,
    mean: mean(values),
    stddev: stddev(values),
  };
}

export function rate(hit: number, total: number): number {
  return total > 0 ? hit / total : 0;
}

export function histogram(
  values: number[],
  binCount = 10,
): { start: number; end: number; count: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ start: min, end: max, count: values.length }];
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: min + width * index,
    end: min + width * (index + 1),
    count: 0,
  }));
  for (const value of values) {
    const index = Math.min(binCount - 1, Math.floor((value - min) / width));
    const bin = bins[index];
    if (bin) bin.count += 1;
  }
  return bins;
}

export function rank(values: number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .toSorted((a, b) => a.value - b.value);
  const ranks = Array.from({ length: values.length }, () => 0);
  let index = 0;
  while (index < sorted.length) {
    let end = index;
    while (end + 1 < sorted.length && sorted[end + 1]?.value === sorted[index]?.value) end += 1;
    const averageRank = (index + end) / 2 + 1;
    for (let cursor = index; cursor <= end; cursor += 1) {
      const entry = sorted[cursor];
      if (entry) ranks[entry.index] = averageRank;
    }
    index = end + 1;
  }
  return ranks;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const x = xs.slice(0, n);
  const y = ys.slice(0, n);
  const averageX = mean(x);
  const averageY = mean(y);
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;
  for (let index = 0; index < n; index += 1) {
    const dx = (x[index] ?? 0) - averageX;
    const dy = (y[index] ?? 0) - averageY;
    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }
  const denominator = Math.sqrt(denominatorX * denominatorY);
  return denominator > 0 ? numerator / denominator : null;
}

export function spearman(xs: number[], ys: number[]): number | null {
  return pearson(rank(xs), rank(ys));
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Difference {
  left: number;
  right: number;
  delta: number;
  low: number;
  high: number;
  confidence: number;
}

/**
 * 2群の統計量の差を bootstrap で推定する。
 * 既定の統計量は平均。中央値を見たい場合は median を渡す。
 */
export function bootstrapDifference(
  left: number[],
  right: number[],
  statistic: Statistic = mean,
  resamples = 500,
  seed = 1,
  confidence = 0.95,
): Difference {
  const random = mulberry32(seed);
  const sample = (values: number[]): number => {
    if (values.length === 0) return 0;
    const picked = Array.from(
      { length: values.length },
      () => values[Math.floor(random() * values.length)] ?? 0,
    );
    return statistic(picked);
  };
  const deltas: number[] = [];
  for (let index = 0; index < resamples; index += 1) {
    deltas.push(sample(left) - sample(right));
  }
  const alpha = (1 - confidence) / 2;
  return {
    left: statistic(left),
    right: statistic(right),
    delta: statistic(left) - statistic(right),
    low: quantile(deltas, alpha),
    high: quantile(deltas, 1 - alpha),
    confidence,
  };
}

export function formatNumber(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatSigned(value: number, digits = 1): string {
  const rounded = value.toFixed(digits);
  return value >= 0 ? `+${rounded}` : rounded;
}
