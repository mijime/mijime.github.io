import React, { type JSX } from "react";
import { useSaiflowState } from "../store";
import { ChartTooltip } from "./ChartTooltip";

const GROUP_COLORS = [
  "rgba(99, 179, 237, 0.7)",
  "rgba(252, 129, 129, 0.7)",
  "rgba(72, 187, 120, 0.7)",
  "rgba(246, 173, 85, 0.7)",
  "rgba(159, 122, 234, 0.7)",
  "rgba(237, 100, 166, 0.7)",
  "rgba(128, 128, 128, 0.7)",
  "rgba(72, 199, 142, 0.7)",
  "rgba(249, 115, 22, 0.7)",
  "rgba(34, 211, 238, 0.7)",
];

const GROUP_STROKE_COLORS = [
  "rgba(99, 179, 237, 1)",
  "rgba(252, 129, 129, 1)",
  "rgba(72, 187, 120, 1)",
  "rgba(246, 173, 85, 1)",
  "rgba(159, 122, 234, 1)",
  "rgba(237, 100, 166, 1)",
  "rgba(128, 128, 128, 1)",
  "rgba(72, 199, 142, 1)",
  "rgba(249, 115, 22, 1)",
  "rgba(34, 211, 238, 1)",
];

export function BarChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const [hover, setHover] = React.useState<{
    i: number;
    mx: number;
    my: number;
  } | null>(null);

  // Collect all groups
  const groupSet = new Set<string>();
  for (const row of rows) {
    for (const g of Object.keys(row.groupIncome)) groupSet.add(g);
    for (const g of Object.keys(row.groupExpense)) groupSet.add(g);
  }
  const groups = [...groupSet].sort();

  const padding = { top: 24, right: 24, bottom: 40, left: 56 };
  const width = Math.max(
    600,
    rows.length * 14 + padding.left + padding.right,
  );
  const height = 340;
  const midY = height / 2;
  const plotH = (height - padding.top - padding.bottom) / 2;

  const maxVal =
    Math.max(
      Math.max(...rows.map((r) => r.totalIncome), 0),
      Math.max(...rows.map((r) => r.totalExpense), 0),
    ) * 1.05 || 1;

  const step = (width - padding.left - padding.right) / rows.length;
  const barW = Math.max(2, step * 0.65);
  const x = (i: number) => padding.left + i * step + step / 2;
  const scale = (v: number) => (v / maxVal) * plotH;

  // Linear ticks
  const tickCount = 5;
  const tickStep = maxVal / tickCount;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round(tickStep * i),
  ).filter((v) => v <= maxVal);

  const netScale = (v: number) =>
    Math.max(-plotH, Math.min(plotH, (v / maxVal) * plotH));

  const netPoints = rows
    .map((r, i) => {
      const net = r.totalIncome - r.totalExpense;
      return `${x(i)},${midY - netScale(net)}`;
    })
    .join(" ");

  const xTickInterval = Math.max(1, Math.floor(rows.length / 10));

  return (
    <div className="h-full overflow-auto relative">
      <svg
        width={width}
        height={height}
        className="font-sans text-xs"
      >
        {/* 0 line */}
        <line
          x1={padding.left}
          y1={midY}
          x2={width - padding.right}
          y2={midY}
          stroke="rgba(128,128,128,0.3)"
        />

        {/* Y axis ticks */}
        {yTicks.map((v) => (
          <g key={`t${v}`}>
            <line
              x1={padding.left}
              y1={midY - scale(v)}
              x2={width - padding.right}
              y2={midY - scale(v)}
              stroke="rgba(128,128,128,0.08)"
            />
            <line
              x1={padding.left}
              y1={midY + scale(v)}
              x2={width - padding.right}
              y2={midY + scale(v)}
              stroke="rgba(128,128,128,0.08)"
            />
            <text
              x={padding.left - 6}
              y={midY - scale(v) + 4}
              textAnchor="end"
              fill="var(--ink)"
              opacity={0.5}
            >
              {v.toLocaleString()}
            </text>
            <text
              x={padding.left - 6}
              y={midY + scale(v) + 4}
              textAnchor="end"
              fill="var(--ink)"
              opacity={0.5}
            >
              {v.toLocaleString()}
            </text>
          </g>
        ))}

        {/* Stacked income and expense bars */}
        {rows.map((r, i) => {
          let incomeOffset = 0;
          let expenseOffset = 0;
          const segments: JSX.Element[] = [];

          for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            const iv = r.groupIncome[g] ?? 0;
            if (iv > 0) {
              segments.push(
                <rect
                  key={`ib-${i}-${g}`}
                  x={x(i) - barW / 2}
                  y={midY - scale(incomeOffset + iv)}
                  width={barW}
                  height={scale(iv)}
                  fill={GROUP_COLORS[gi % GROUP_COLORS.length]}
                  stroke={GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length]}
                  strokeWidth={0.5}
                />,
              );
              incomeOffset += iv;
            }
          }

          for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            const ev = r.groupExpense[g] ?? 0;
            if (ev > 0) {
              segments.push(
                <rect
                  key={`eb-${i}-${g}`}
                  x={x(i) - barW / 2}
                  y={midY + scale(expenseOffset)}
                  width={barW}
                  height={scale(ev)}
                  fill={GROUP_COLORS[gi % GROUP_COLORS.length]}
                  stroke={GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length]}
                  strokeWidth={0.5}
                />,
              );
              expenseOffset += ev;
            }
          }

          return <g key={`bar-${i}`}>{segments}</g>;
        })}

        {/* Net trend line */}
        <polyline
          points={netPoints}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />

        {/* Net data dots */}
        {rows.map((r, i) => {
          const net = r.totalIncome - r.totalExpense;
          return (
            <circle
              key={`netdot-${i}`}
              cx={x(i)}
              cy={midY - netScale(net)}
              r={2.5}
              fill="#3b82f6"
            />
          );
        })}

        {/* Hover bands */}
        {rows.map((_, i) => (
          <rect
            key={`hb${i}`}
            x={x(i) - step / 2}
            y={padding.top}
            width={step}
            height={height - padding.top - padding.bottom}
            fill="transparent"
            onMouseEnter={(e) =>
              setHover({ i, mx: e.clientX, my: e.clientY })
            }
            onMouseMove={(e) =>
              setHover((h) =>
                h ? { ...h, mx: e.clientX, my: e.clientY } : null,
              )
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
          {groups.map((g, gi) => {
            const lx = gi * 90;
            return (
              <g key={g} transform={`translate(${lx}, 0)`}>
                <rect
                  x={0}
                  y={-10}
                  width={14}
                  height={10}
                  fill={GROUP_COLORS[gi % GROUP_COLORS.length]}
                  stroke={GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length]}
                  strokeWidth={0.5}
                />
                <text x={18} y={0} fill="var(--ink)" opacity={0.7} fontSize={11}>
                  {g}
                </text>
              </g>
            );
          })}
          {/* Net legend */}
          <g transform={`translate(${groups.length * 90}, 0)`}>
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
                  {
                    label: "年齢",
                    value: String(rows[hover.i].age),
                  },
                  {
                    label: "収入",
                    value: rows[hover.i].totalIncome.toLocaleString(),
                  },
                  {
                    label: "支出",
                    value: rows[hover.i].totalExpense.toLocaleString(),
                  },
                  ...groups
                    .map((g, gi) => [
                      {
                        label: `${g} 収入`,
                        value: (
                          rows[hover.i].groupIncome[g] ?? 0
                        ).toLocaleString(),
                        color: GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length],
                      },
                      {
                        label: `${g} 支出`,
                        value: (
                          rows[hover.i].groupExpense[g] ?? 0
                        ).toLocaleString(),
                        color: GROUP_STROKE_COLORS[gi % GROUP_STROKE_COLORS.length],
                      },
                    ])
                    .flat(),
                  {
                    label: "収支",
                    value: (
                      rows[hover.i].totalIncome -
                      rows[hover.i].totalExpense
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
