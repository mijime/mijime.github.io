import React from "react";
import { useSaiflowState } from "../store";
import { ChartTooltip } from "./ChartTooltip";

function logTicks(max: number): number[] {
  const ticks: number[] = [];
  for (let i = 0; i <= Math.floor(Math.log10(max + 1)); i++) {
    const v = 10 ** i;
    if (v <= max) ticks.push(v);
  }
  return ticks;
}

export function BarChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const [hover, setHover] = React.useState<{ i: number; mx: number; my: number } | null>(null);

  const padding = { top: 24, right: 24, bottom: 40, left: 56 };
  const width = Math.max(600, rows.length * 14 + padding.left + padding.right);
  const height = 340;
  const midY = height / 2;
  const plotH = (height - padding.top - padding.bottom) / 2;

  const maxVal = Math.max(
    Math.max(...rows.map((r) => r.totalIncome), 0),
    Math.max(...rows.map((r) => r.totalExpense), 0),
  ) * 1.05 || 1;

  const step = (width - padding.left - padding.right) / rows.length;
  const barW = Math.max(2, step * 0.65);
  const x = (i: number) => padding.left + i * step + step / 2;
  const scale = (v: number) => Math.log10(v + 1) / Math.log10(maxVal + 1);
  const incomeY = (v: number) => midY - scale(v) * plotH;
  const expenseY = (v: number) => midY + scale(v) * plotH;

  const yTicks = logTicks(maxVal);

  const netY = (net: number) => (net >= 0 ? incomeY(net) : expenseY(-net));

  const incomePoints = rows.map((r, i) => `${x(i)},${incomeY(r.totalIncome)}`).join(" ");
  const expensePoints = rows.map((r, i) => `${x(i)},${expenseY(r.totalExpense)}`).join(" ");
  const netPoints = rows.map((r, i) => `${x(i)},${netY(r.totalIncome - r.totalExpense)}`).join(" ");

  const xTickInterval = Math.max(1, Math.floor(rows.length / 10));

  return (
    <div className="h-full overflow-auto relative">
      <svg width={width} height={height} className="font-sans text-xs">
        {/* 0 line */}
        <line
          x1={padding.left}
          y1={midY}
          x2={width - padding.right}
          y2={midY}
          stroke="rgba(128,128,128,0.3)"
        />

        {/* Y axis ticks (shared log scale) */}
        {yTicks.map((v) => (
          <g key={`t${v}`}>
            <line
              x1={padding.left}
              y1={incomeY(v)}
              x2={width - padding.right}
              y2={incomeY(v)}
              stroke="rgba(128,128,128,0.08)"
            />
            <line
              x1={padding.left}
              y1={expenseY(v)}
              x2={width - padding.right}
              y2={expenseY(v)}
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

        {/* Net trend line */}
        <polyline
          points={netPoints}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />

        {/* Data dots */}
        {rows.map((r, i) => (
          <g key={`dot${i}`}>
            <circle cx={x(i)} cy={incomeY(r.totalIncome)} r={2.5} fill="rgba(72, 187, 120, 1)" />
            <circle cx={x(i)} cy={expenseY(r.totalExpense)} r={2.5} fill="rgba(252, 129, 129, 1)" />
            <circle cx={x(i)} cy={netY(r.totalIncome - r.totalExpense)} r={2.5} fill="#3b82f6" />
          </g>
        ))}

        {/* Hover bands */}
        {rows.map((_, i) => (
          <rect
            key={`hb${i}`}
            x={x(i) - step / 2}
            y={padding.top}
            width={step}
            height={height - padding.top - padding.bottom}
            fill="transparent"
            onMouseEnter={(e) => setHover({ i, mx: e.clientX, my: e.clientY })}
            onMouseMove={(e) =>
              setHover((h) => (h ? { ...h, mx: e.clientX, my: e.clientY } : null))
            }
            onMouseLeave={() => setHover(null)}
          />
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
          <g transform="translate(120, 0)">
            <line
              x1={0}
              y1={-5}
              x2={14}
              y2={-5}
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />
            <text x={18} y={0} fill="var(--ink)" opacity={0.7} fontSize={11}>
              収支
            </text>
          </g>
        </g>
      </svg>
      <ChartTooltip
        data={
          hover
            ? {
                x: hover.mx,
                y: hover.my,
                lines: [
                  { label: "年齢", value: String(rows[hover.i].age) },
                  { label: "収入", value: rows[hover.i].totalIncome.toLocaleString() },
                  { label: "支出", value: rows[hover.i].totalExpense.toLocaleString() },
                  {
                    label: "収支",
                    value: (
                      rows[hover.i].totalIncome - rows[hover.i].totalExpense
                    ).toLocaleString(),
                  },
                ],
              }
            : null
        }
      />
    </div>
  );
}
