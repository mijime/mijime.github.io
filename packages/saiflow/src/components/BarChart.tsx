import { useSaiflowState } from "../store";

export function BarChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const maxVal = Math.max(
    ...rows.map((r) => Math.max(r.totalIncome, r.totalExpense)),
    0,
  ) * 1.1 || 1;

  const padding = { top: 10, right: 20, bottom: 30, left: 50 };
  const width = 600;
  const height = 300;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const barWidth = Math.max(2, plotW / rows.length - 2);
  const x = (i: number) => padding.left + i * (plotW / rows.length) + (plotW / rows.length - barWidth) / 2;
  const y0 = padding.top + plotH / 2;
  const scale = (plotH / 2) / maxVal;
  const y = (v: number) => y0 - v * scale;

  const yTicks = 5;
  const yStep = maxVal / yTicks;

  return (
    <div className="h-full overflow-auto p-2">
      <svg width={width} height={height} className="text-xs">
        {/* 0 line */}
        <line x1={padding.left} y1={y0} x2={padding.left + plotW} y2={y0} stroke="var(--ink)" strokeWidth={1} opacity={0.3} />
        {/* Y axis labels */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = yStep * i;
          return (
            <text key={i} x={padding.left - 5} y={y(val) + 4} textAnchor="end" fill="var(--ink)" opacity={0.6}>
              {Math.round(val)}
            </text>
          );
        })}
        {/* X axis labels */}
        {rows.filter((_, i) => i % 5 === 0 || i === rows.length - 1).map((r) => {
          const idx = rows.indexOf(r);
          return (
            <text key={idx} x={x(idx) + barWidth / 2} y={height - 5} textAnchor="middle" fill="var(--ink)" opacity={0.6}>
              {r.age}
            </text>
          );
        })}
        {/* Bars */}
        {rows.map((r, i) => {
          const incomeH = r.totalIncome * scale;
          const expenseH = r.totalExpense * scale;
          return (
            <g key={i}>
              <rect
                x={x(i)}
                y={y(r.totalIncome)}
                width={barWidth}
                height={incomeH}
                fill="#22c55e"
                opacity={0.7}
              />
              <rect
                x={x(i)}
                y={y0}
                width={barWidth}
                height={expenseH}
                fill="#ef4444"
                opacity={0.7}
              />
            </g>
          );
        })}
        {/* Legend */}
        <g transform={`translate(${padding.left}, ${padding.top - 5})`}>
          <g>
            <rect x={0} y={-8} width={12} height={8} fill="#22c55e" opacity={0.7} />
            <text x={16} y={0} fill="var(--ink)" opacity={0.8} fontSize={10}>収入</text>
          </g>
          <g transform="translate(60, 0)">
            <rect x={0} y={0} width={12} height={8} fill="#ef4444" opacity={0.7} />
            <text x={16} y={0} fill="var(--ink)" opacity={0.8} fontSize={10}>支出</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
