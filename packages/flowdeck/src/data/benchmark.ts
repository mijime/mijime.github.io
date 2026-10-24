import raw from "./benchmark.json";

export interface BenchmarkEntry {
  players: number;
  days: number;
  swing: number;
  runs: number;
  score: { p10: number; p25: number; median: number; p75: number; p90: number; mean: number };
  stars: number[];
  failRate: number;
  debt: number;
  completed: number;
  expired: number;
  avgWip: number;
  avgLeadTime: number;
  riskDebt: number;
}

interface BenchmarkFile {
  version: number;
  note: string;
  configs: Record<string, BenchmarkEntry>;
}

const benchmark = raw as BenchmarkFile;

export function benchmarkFor(players: number, days: number, swing = 0.1): BenchmarkEntry | null {
  return benchmark.configs[`${players}x${days}x${swing.toFixed(1)}`] ?? null;
}

/** p10/p25/median/p75/p90 から percentile を線形補間する。 */
export function scorePercentile(entry: BenchmarkEntry, score: number): number {
  const points: [number, number][] = [
    [entry.score.p10, 0.1],
    [entry.score.p25, 0.25],
    [entry.score.median, 0.5],
    [entry.score.p75, 0.75],
    [entry.score.p90, 0.9],
  ];
  if (score <= (points[0]?.[0] ?? 0)) return 0.1;
  if (score >= (points.at(-1)?.[0] ?? 0)) return 0.9;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    if (score <= current[0]) {
      const span = current[0] - previous[0];
      const ratio = span > 0 ? (score - previous[0]) / span : 0;
      return previous[1] + (current[1] - previous[1]) * ratio;
    }
  }
  return 0.5;
}
