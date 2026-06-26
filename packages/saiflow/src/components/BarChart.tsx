import { useSaiflowState } from "../store";

function niceStep(max: number): number {
  const raw = max / 4;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const mant = raw / exp;
  return exp * (mant <= 1.5 ? 1 : mant <= 3 ? 2 : mant <= 7 ? 5 : 10);
}

function ticks(max: number, step: number): number[] {
  const result: number[] = [];
  for (let v = 0; v <= max; v += step) result.push(Math.round(v));
  return result;
}

export function BarChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const padding = { top: 24, right: 24, bottom: 40, left: 56 };
  const width = Math.max(600, rows.length * 14 + padding.left + padding.right);
  const height = 340;
  const midY = height / 2;
  const plotH = (height - padding.top - padding.bottom) / 2;

  const maxIncome = Math.max(...rows.map((r) => r.totalIncome), 0) * 1.1 || 1;
  const maxExpense = Math.max(...rows.map((r) => r.totalExpense), 0) * 1.1 || 1;

  const step = (width - padding.left - padding.right) / rows.length;
  const barW = Math.max(2, step * 0.65);
  const x = (i: number) => padding.left + i * step + step / 2;
  const incomeY = (v: number) => midY - (v / maxIncome) * plotH;
  const expenseY = (v: number) => midY + (v / maxExpense) * plotH;

  const incomeTickStep = niceStep(maxIncome);
  const expenseTickStep = niceStep(maxExpense);

  const incomePoints = rows.map((r, i) => `${x(i)},${incomeY(r.totalIncome)}`).join(" ");
  const expensePoints = rows.map((r, i) => `${x(i)},${expenseY(r.totalExpense)}`).join(" ");

  const xTickInterval = Math.max(1, Math.floor(rows.length / 10));

  return (
    <div className="h-full overflow-auto">
      <svg width={width} height={height} className="font-sans text-xs">
        {/* 0 line */}
        <line
          x1={padding.left}
          y1={midY}
          x2={width - padding.right}
          y2={midY}
          stroke="rgba(128,128,128,0.3)"
        />

        {/* Y axis ticks (income) */}
        {ticks(maxIncome, incomeTickStep).map((v) => (
          <g key={`i${v}`}>
            <line
              x1={padding.left}
              y1={incomeY(v)}
              x2={width - padding.right}
              y2={incomeY(v)}
              stroke="rgba(128,128,128,0.08)"
            />
            <text
              x={padding.left - 6}
              y={incomeY(v) + 4}
              textAnchor="end"
              fill="var(--ink)"
              opacity={0.5}
            >
              {v}
            </text>
          </g>
        ))}

        {/* Y axis ticks (expense) */}
        {ticks(maxExpense, expenseTickStep).map((v) => (
          <g key={`e${v}`}>
            <line
              x1={padding.left}
              y1={expenseY(v)}
              x2={width - padding.right}
              y2={expenseY(v)}
              stroke="rgba(128,128,128,0.08)"
            />
            <text
              x={padding.left - 6}
              y={expenseY(v) + 4}
              textAnchor="end"
              fill="var(--ink)"
              opacity={0.5}
            >
              {v}
            </text>
          </g>
        ))}

        {/* Income bars */}
        {rows.map((r, i) => (
          <rect
            key={`ib${i}`}
            x={x(i) - barW / 2}
            y={incomeY(r.totalIncome)}
            width={barW}
            height={midY - incomeY(r.totalIncome)}
            rx={3}
            fill="rgba(72, 187, 120, 0.6)"
          />
        ))}

        {/* Expense bars */}
        {rows.map((r, i) => (
          <rect
            key={`eb${i}`}
            x={x(i) - barW / 2}
            y={midY}
            width={barW}
            height={expenseY(r.totalExpense) - midY}
            rx={3}
            fill="rgba(252, 129, 129, 0.6)"
          />
        ))}

        {/* Income trend line */}
        <polyline
          points={incomePoints}
          fill="none"
          stroke="rgba(72, 187, 120, 0.9)"
          strokeWidth={1.5}
        />

        {/* Expense trend line */}
        <polyline
          points={expensePoints}
          fill="none"
          stroke="rgba(252, 129, 129, 0.9)"
          strokeWidth={1.5}
        />

        {/* Data dots */}
        {rows.map((r, i) => (
          <g key={`dot${i}`}>
            <circle cx={x(i)} cy={incomeY(r.totalIncome)} r={2.5} fill="rgba(72, 187, 120, 1)" />
            <circle cx={x(i)} cy={expenseY(r.totalExpense)} r={2.5} fill="rgba(252, 129, 129, 1)" />
          </g>
        ))}

        {/* X axis labels */}
        {rows.map((r, i) => {
          if (i % xTickInterval !== 0 && i !== rows.length - 1) return null;
          return (
            <text
              key={i}
              x={x(i)}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              fill="var(--ink)"
              opacity={0.5}
            >
              {r.age}
            </text>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padding.left}, 6)`}>
          <g>
            <rect x={0} y={-10} width={14} height={10} rx={2} fill="rgba(72, 187, 120, 0.7)" />
            <text x={18} y={0} fill="var(--ink)" opacity={0.7} fontSize={11}>
              収入
            </text>
          </g>
          <g transform="translate(60, 0)">
            <rect x={0} y={-10} width={14} height={10} rx={2} fill="rgba(252, 129, 129, 0.7)" />
            <text x={18} y={0} fill="var(--ink)" opacity={0.7} fontSize={11}>
              支出
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
