import type { ScoreSummary } from "../../engine/analytics/result";
import type { BenchmarkEntry } from "../../data/benchmark";
import { scorePercentile } from "../../data/benchmark";

function ScoreRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "total";
}) {
  const color =
    tone === "positive"
      ? "text-(--success)"
      : tone === "negative"
        ? "text-(--danger)"
        : "text-(--ink)";
  return (
    <li
      className={`flex items-baseline justify-between gap-2 ${
        tone === "total" ? "border-t border-(--border) pt-1 font-semibold" : ""
      }`}
    >
      <span className={tone === "total" ? "" : "text-(--mid)"}>{label}</span>
      <span className={`tabular-nums ${color}`}>
        {tone === "positive" ? "+" : tone === "negative" ? "-" : ""}
        {Math.abs(value)}
      </span>
    </li>
  );
}

export function ScoreBreakdown({
  score,
  benchmark,
}: {
  score: ScoreSummary;
  benchmark: BenchmarkEntry | null;
}) {
  const percentile = benchmark ? scorePercentile(benchmark, score.finalScore) : null;
  const progress =
    score.nextStar > 0 ? Math.min(1, Math.max(0, score.finalScore / score.nextStar)) : 1;

  return (
    <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="serif text-[13px] font-semibold">スコア内訳</h2>
        {percentile !== null && (
          <span className="text-[8px] text-(--mid)">
            全員ボット比 上位{Math.round((1 - percentile) * 100)}%
          </span>
        )}
      </div>
      <ul className="mt-2 space-y-1 text-[10px]">
        <ScoreRow label="企業価値（報酬カード）" value={score.teamScore} tone="positive" />
        <ScoreRow label="技術的負債" value={score.debtPenalty} tone="negative" />
        {score.incidentPenalty > 0 && (
          <ScoreRow label="期限切れ罰則" value={score.incidentPenalty} tone="negative" />
        )}
        <ScoreRow label="最終評価" value={score.finalScore} tone="total" />
      </ul>

      <div className="mt-2">
        <div className="flex items-baseline justify-between text-[8px] text-(--mid)">
          <span>{score.stars === 3 ? "最高評価" : `次の星まであと ${score.nextStarGap}pt`}</span>
          <span className="tabular-nums">
            {score.finalScore} / {score.nextStar}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-(--grid)">
          <div
            className="h-full rounded-full bg-(--accent) transition-[width]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {benchmark && (
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[8px]">
          <div className="rounded-sm border border-(--border) px-1 py-1">
            <span className="block text-(--mid)">参考 中央値</span>
            <span className="block text-[11px] font-semibold tabular-nums">
              {benchmark.score.median}
            </span>
          </div>
          <div className="rounded-sm border border-(--border) px-1 py-1">
            <span className="block text-(--mid)">参考 星3率</span>
            <span className="block text-[11px] font-semibold tabular-nums">
              {Math.round((benchmark.stars[3] ?? 0) * 100)}%
            </span>
          </div>
          <div className="rounded-sm border border-(--border) px-1 py-1">
            <span className="block text-(--mid)">参考 失敗率</span>
            <span className="block text-[11px] font-semibold tabular-nums">
              {Math.round(benchmark.failRate * 100)}%
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
