import type { DaySnapshot } from "../../engine/types";

interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
  format?: (value: number) => string;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 28 - ((value - min) / span) * 24;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `0,30 ${points.join(" ")} 100,30`;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function TrendChart({ trend }: { trend: DaySnapshot[] }) {
  if (trend.length === 0) {
    return <p className="text-[9px] text-(--mid)">日次データがありません。</p>;
  }
  const series: Series[] = [
    {
      key: "score",
      label: "企業価値",
      color: "#34d399",
      values: trend.map((snapshot) => snapshot.teamScore),
    },
    {
      key: "debt",
      label: "技術的負債",
      color: "#f87171",
      values: trend.map((snapshot) => snapshot.teamDebt),
    },
    { key: "wip", label: "WIP", color: "#fbbf24", values: trend.map((snapshot) => snapshot.wip) },
  ];
  return (
    <div className="space-y-2">
      {series.map((entry) => {
        const last = entry.values.at(-1) ?? 0;
        const peak = Math.max(...entry.values);
        return (
          <div key={entry.key}>
            <div className="flex items-baseline justify-between text-[8px]">
              <span className="inline-flex items-center gap-1 text-(--mid)">
                <span
                  className="inline-block h-1 w-3 rounded-full"
                  style={{ background: entry.color }}
                />
                {entry.label}
              </span>
              <span className="tabular-nums text-(--ink)">
                最終 {last} / 最大 {peak}
              </span>
            </div>
            <Sparkline values={entry.values} color={entry.color} />
          </div>
        );
      })}
      <div className="flex justify-between text-[7px] text-(--mid)">
        <span>Day {trend[0]?.day}</span>
        <span>Day {trend.at(-1)?.day}</span>
      </div>
    </div>
  );
}
