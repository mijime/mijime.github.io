import type { RiskSummary as RiskData } from "../../engine/analytics/result";

export function RiskSummary({ risk }: { risk: RiskData }) {
  if (risk.drawn === 0 && risk.debt === 0) {
    return (
      <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
        <h2 className="serif text-[13px] font-semibold">リスク</h2>
        <p className="mt-1 text-[9px] text-(--mid)">リスクカードは引かれませんでした。</p>
      </section>
    );
  }
  return (
    <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="serif text-[13px] font-semibold">リスク</h2>
        <span className="text-[8px] text-(--mid)">
          吸収率 {Math.round(risk.absorbedRate * 100)}%
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[8px]">
        <div className="rounded-sm border border-(--border) px-1 py-1">
          <span className="block text-(--mid)">ドロー</span>
          <span className="block text-[12px] font-semibold tabular-nums">{risk.drawn}</span>
        </div>
        <div className="rounded-sm border border-(--border) px-1 py-1">
          <span className="block text-(--mid)">未吸収</span>
          <span className="block text-[12px] font-semibold tabular-nums text-red-600 dark:text-red-400">
            {risk.unmet}
          </span>
        </div>
        <div className="rounded-sm border border-(--border) px-1 py-1">
          <span className="block text-(--mid)">発生負債</span>
          <span className="block text-[12px] font-semibold tabular-nums text-red-600 dark:text-red-400">
            {risk.debt}
          </span>
        </div>
      </div>

      {risk.top.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[8.5px]">
          {risk.top.map((row) => (
            <li key={row.id} className="flex items-baseline justify-between gap-2">
              <span className="truncate text-(--mid)">{row.title}</span>
              <span className="tabular-nums text-(--ink)">
                {row.debt > 0 ? `負債 ${row.debt}` : `吸収 ${row.absorbed}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
