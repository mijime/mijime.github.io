import { useState, useEffect, useMemo } from "react";
import { getEntriesByDateRange, getAllEntries } from "./store";
import { computeSummary, getDateRangeForPeriod, type Period, type SummaryStats } from "./summary";
import type { Entry } from "./types";

interface SummaryViewProps {
  onSelectEmoji: (emoji: string) => void;
  list?: string;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "7d", label: "7日" },
  { key: "30d", label: "30日" },
  { key: "all", label: "すべて" },
];

export function SummaryView({ onSelectEmoji, list }: SummaryViewProps) {
  const [period, setPeriod] = useState<Period>("7d");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const range = getDateRangeForPeriod(period);
    const promise = range ? getEntriesByDateRange(range.from, range.to, list) : getAllEntries(list);
    promise.then(setEntries).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
      setEntries([]);
    });
  }, [period, list]);

  const summary: SummaryStats = useMemo(() => computeSummary(entries), [entries]);

  if (error) {
    return <div className="emolog-summary-error">⚠️ {error}</div>;
  }

  return (
    <div className="emolog-summary">
      <div className="emolog-summary-periods">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`emolog-summary-period${period === p.key ? " emolog-summary-period-active" : ""}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {summary.total === 0 ? (
        <div className="emolog-summary-empty">この期間の記録はありません</div>
      ) : (
        <>
          <div className="emolog-summary-stats">
            <div className="emolog-summary-stat">
              <span className="emolog-summary-stat-value">{summary.total}</span>
              <span className="emolog-summary-stat-label">記録</span>
            </div>
            <div className="emolog-summary-stat">
              <span className="emolog-summary-stat-value">{summary.distinct}</span>
              <span className="emolog-summary-stat-label">感情</span>
            </div>
          </div>
          <div className="emolog-summary-rankings">
            {summary.rankings.map((r) => (
              <button
                key={r.emoji}
                className="emolog-summary-ranking"
                onClick={() => onSelectEmoji(r.emoji)}
              >
                <span className="emolog-summary-ranking-emoji">{r.emoji}</span>
                <div className="emolog-summary-ranking-bar-container">
                  <div
                    className="emolog-summary-ranking-bar"
                    style={{ width: `${Math.max(r.pct, 1)}%` }}
                  />
                </div>
                <span className="emolog-summary-ranking-count">{r.count}</span>
                <span className="emolog-summary-ranking-pct">{r.pct}%</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
