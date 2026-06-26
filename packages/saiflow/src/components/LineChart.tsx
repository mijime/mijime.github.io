import { useSaiflowState } from "../store";

export function LineChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const maxIncome = Math.max(...rows.map((r) => r.totalIncome), 0);
  const maxExpense = Math.max(...rows.map((r) => r.totalExpense), 0);
  const maxVal = Math.max(maxIncome, maxExpense) * 1.1 || 1;

  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 600;
  const height = 350;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const x = (i: number) => padding.left + (i / (rows.length - 1 || 1)) * plotW;
  const y = (v: number) => padding.top + plotH - (v / maxVal) * plotH;
  const y0 = y(0);

  const yTicks = 5;
  const yStep = maxVal / yTicks;

  return (
    <div className="h-full overflow-auto p-2">
      <svg width={width} height={height} className="text-xs">
        {/* Y axis labels */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = yStep * i;
          return (
            <text key={i} x={padding.left - 5} y={y(val) + 4} textAnchor="end" fill="var(--ink)" opacity={0.6}>
              {Math.round(val)}
            </text>
          );
        })}
        {/* 0 line */}
        <line x1={padding.left} y1={y0} x2={padding.left + plotW} y2={y0} stroke="var(--ink)" strokeWidth={1} opacity={0.3} />
        {/* Income line */}
        <polyline
          points={rows.map((r, i) => `${x(i)},${y(r.totalIncome)}`).join(" ")}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
        />
        {/* Expense line */}
        <polyline
          points={rows.map((r, i) => `${x(i)},${y(r.totalExpense)}`).join(" ")}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
        />
        {/* Net line */}
        <polyline
          points={rows.map((r, i) => `${x(i)},${y(Math.abs(r.totalIncome - r.totalExpense))}`).join(" ")}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4,2"
        />
        {/* X axis labels */}
        {rows.filter((_, i) => i % 5 === 0 || i === rows.length - 1).map((r) => {
          const idx = rows.indexOf(r);
          return (
            <text key={idx} x={x(idx)} y={height - 5} textAnchor="middle" fill="var(--ink)" opacity={0.6}>
              {r.age}
            </text>
          );
        })}
        {/* Legend */}
        <g transform={`translate(${padding.left}, ${padding.top - 5})`}>
          <g>
            <line x1={0} y1={0} x2={12} y2={0} stroke="#22c55e" strokeWidth={2} />
            <text x={16} y={4} fill="var(--ink)" opacity={0.8} fontSize={10}>収入</text>
          </g>
          <g transform="translate(60, 0)">
            <line x1={0} y1={0} x2={12} y2={0} stroke="#ef4444" strokeWidth={2} />
            <text x={16} y={4} fill="var(--ink)" opacity={0.8} fontSize={10}>支出</text>
          </g>
          <g transform="translate(120, 0)">
            <line x1={0} y1={0} x2={12} y2={0} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="2,1" />
            <text x={16} y={4} fill="var(--ink)" opacity={0.8} fontSize={10}>収支</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
