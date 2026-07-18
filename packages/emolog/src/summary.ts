import type { Entry } from "./types";

export type Period = "7d" | "30d" | "all";

export interface SummaryStats {
  total: number;
  distinct: number;
  rankings: { emoji: string; count: number; pct: number }[];
}

export function computeSummary(entries: Entry[]): SummaryStats {
  const total = entries.length;
  const countMap = new Map<string, number>();
  for (const e of entries) {
    countMap.set(e.emoji, (countMap.get(e.emoji) ?? 0) + 1);
  }
  const rankings = [...countMap.entries()]
    .map(([emoji, count]) => ({
      emoji,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .toSorted((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.emoji.localeCompare(b.emoji);
    });
  return { total, distinct: countMap.size, rankings };
}

export function getDateRangeForPeriod(period: Period): { from: string; to: string } | null {
  const today = new Date();
  const to = formatLocalDate(today);
  if (period === "all") return null;
  const days = period === "7d" ? 6 : 29;
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { from: formatLocalDate(from), to };
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
