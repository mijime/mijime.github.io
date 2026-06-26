import { useSaiflowState } from "../store";

export function BarChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const maxVal = Math.max(...rows.map((r) => Math.max(r.totalIncome, r.totalExpense)), 0);
  const padding = { top: 10, right: 20, bottom: 30, left: 50 };
  const width = 600;
  const height = 300;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const barWidth = Math.max(2, plotW / rows.length - 2);
  const x = (i: number) => padding.left + i * (plotW / rows.length) + (plotW / rows.length - barWidth) / 2;
  const y = (v: number) => padding.top + plotH - (v / maxVal) * plotH;

  const yTicks = 5;
  const yStep = maxVal / yTicks;

  return (
    <div className="h-full overflow-auto p-2">
      <svg width={width} height={height} className="text-xs">
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = yStep * i;
          return (
            <text key={i} x={padding.left - 5} y={y(val) + 4} textAnchor="end" fill="var(--ink)" opacity={0.6}>
              {Math.round(val)}
            </text>
          );
        })}
        {rows.filter((_, i) => i % 5 === 0 || i === rows.length - 1).map((r, i) => {
          const idx = rows.indexOf(r);
          return (
            <text key={i} x={x(idx) + barWidth / 2} y={height - 5} textAnchor="middle" fill="var(--ink)" opacity={0.6}>
              {r.age}
            </text>
          );
        })}
        {rows.map((r, i) => {
          const expenseH = (r.totalExpense / maxVal) * plotH;
          const incomeH = (r.totalIncome / maxVal) * plotH;
          const incomeY = padding.top + plotH - expenseH - incomeH;
          const expenseY = padding.top + plotH - expenseH;
          return (
            <g key={i}>
              <rect
                x={x(i)}
                y={expenseY}
                width={barWidth}
                height={expenseH}
                fill="#ef4444"
                opacity={0.7}
              />
              <rect
                x={x(i)}
                y={incomeY}
                width={barWidth}
                height={incomeH}
                fill="#22c55e"
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
            <rect x={0} y={-8} width={12} height={8} fill="#ef4444" opacity={0.7} />
            <text x={16} y={0} fill="var(--ink)" opacity={0.8} fontSize={10}>支出</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
