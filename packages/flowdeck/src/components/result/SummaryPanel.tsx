import type { ResultSummary } from "../../engine/analytics/result";
import type { BenchmarkEntry } from "../../data/benchmark";
import { FlowSummary } from "./FlowSummary";
import { PlayStyleSummary } from "./PlayStyleSummary";
import { RiskSummary } from "./RiskSummary";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { TrendChart } from "./TrendChart";

export function SummaryPanel({
  summary,
  benchmark,
}: {
  summary: ResultSummary;
  benchmark: BenchmarkEntry | null;
}) {
  return (
    <section className="mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="serif text-sm font-semibold">プロジェクト・サマリー</h2>
        {benchmark && (
          <span className="text-[8px] text-(--mid)">参考値: 全員ボット {benchmark.runs} seeds</span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <ScoreBreakdown score={summary.score} benchmark={benchmark} />
        <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
          <h2 className="serif text-[13px] font-semibold">日次推移</h2>
          <div className="mt-2">
            <TrendChart trend={summary.trend} />
          </div>
        </section>
        <FlowSummary flow={summary.flow} benchmark={benchmark} />
        <RiskSummary risk={summary.risk} />
        <PlayStyleSummary style={summary.style} />
      </div>
    </section>
  );
}
