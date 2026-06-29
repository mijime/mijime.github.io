import React from "react";
import { useSaiflowState } from "../store";
import { computeCategories } from "../categories";
import { ChartTooltip } from "./ChartTooltip";
import { logTicks } from "./BarChart";

const PALETTE = [
  "hsl(120, 65%, 50%)",
  "hsl(200, 65%, 55%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 55%, 55%)",
  "hsl(160, 55%, 45%)",
  "hsl(0, 65%, 55%)",
  "hsl(45, 75%, 50%)",
  "hsl(240, 55%, 60%)",
  "hsl(320, 50%, 50%)",
  "hsl(80, 55%, 45%)",
  "hsl(180, 50%, 45%)",
  "hsl(10, 70%, 50%)",
];

export function CategoryChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const { allCategories, breakdowns } = computeCategories(rows);

  const denseCats = allCategories.filter((cat) =>
    breakdowns.some((b) => b.net[cat] !== 0),
  );

  const catColors = new Map<string, string>();
  denseCats.forEach((cat, i) => {
    catColors.set(cat, PALETTE[i % PALETTE.length]);
  });

  const [hover, setHover] = React.useState<{
    i: number;
    mx: number;
    my: number;
  } | null>(null);

  const padding = { top: 24, right: 24, bottom: 40, left: 56 };
  const width = Math.max(600, rows.length * 14 + padding.left + padding.right);
  const height = 380;
  const midY = height / 2;
  const plotH = (height - padding.top - padding.bottom) / 2;

  const maxIncome = Math.max(
    ...breakdowns.map((b) => denseCats.reduce((s, c) => s + (b.income[c] ?? 0), 0)),
    0,
  );
  const maxExpense = Math.max(
    ...breakdowns.map((b) => denseCats.reduce((s, c) => s + (b.expense[c] ?? 0), 0)),
    0,
  );
  const maxVal = Math.max(maxIncome, maxExpense, 1) * 1.05;

  const step = (width - padding.left - padding.right) / rows.length;
  const barW = Math.max(3, step * 0.65);
  const x = (i: number) => padding.left + i * step + step / 2;

  const scale = (v: number) => Math.log10(v + 1) / Math.log10(maxVal + 1);
  const incomeY = (v: number) => midY - scale(v) * plotH;
  const expenseY = (v: number) => midY + scale(v) * plotH;

  const yTicks = logTicks(maxVal);
  const xTickInterval = Math.max(1, Math.floor(rows.length / 10));

  return (
    <div className="h-full overflow-auto relative">
      <svg width={width} height={height} className="font-sans text-xs">
        <line
          x1={padding.left}
          y1={midY}
          x2={width - padding.right}
          y2={midY}
          stroke="rgba(128,128,128,0.3)"
        />

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

        {breakdowns.map((b, i) => {
          const xi = x(i);
          let incomeCum = 0;
          const incomeRects = denseCats
            .map((cat) => {
              const v = b.income[cat] ?? 0;
              if (v <= 0) return null;
              const bottom = incomeCum;
              incomeCum += v;
              const top = incomeCum;
              const sy = incomeY(top);
              const h = incomeY(bottom) - incomeY(top);
              return (
                <rect
                  key={`inc-${cat}`}
                  x={xi - barW / 2}
                  y={sy}
                  width={barW}
                  height={Math.max(0.5, h)}
                  fill={catColors.get(cat)!}
                  opacity={0.75}
                  rx={1}
                />
              );
            })
            .filter(Boolean);

          let expenseCum = 0;
          const expenseRects = denseCats
            .map((cat) => {
              const v = b.expense[cat] ?? 0;
              if (v <= 0) return null;
              const bottom = expenseCum;
              expenseCum += v;
              const top = expenseCum;
              const sy = expenseY(bottom);
              const h = expenseY(top) - expenseY(bottom);
              return (
                <rect
                  key={`exp-${cat}`}
                  x={xi - barW / 2}
                  y={sy}
                  width={barW}
                  height={Math.max(0.5, h)}
                  fill={catColors.get(cat)!}
                  opacity={0.75}
                  rx={1}
                />
              );
            })
            .filter(Boolean);

          return (
            <g key={i}>
              {incomeRects}
              {expenseRects}
            </g>
          );
        })}

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

        {rows.map((r, i) => {
          if (i % xTickInterval !== 0 && i !== rows.length - 1) return null;
          return (
            <text
              key={`x${i}`}
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

        <g transform={`translate(${padding.left}, 4)`}>
          {denseCats.map((cat, i) => {
            const col = i % 6;
            const row = Math.floor(i / 6);
            const lx = col * 130;
            const ly = row * 16;
            return (
              <g key={cat} transform={`translate(${lx}, ${ly})`}>
                <rect x={0} y={-10} width={14} height={10} rx={2} fill={catColors.get(cat)!} opacity={0.75} />
                <text x={18} y={0} fill="var(--ink)" opacity={0.7} fontSize={11}>
                  {cat}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <ChartTooltip
        data={
          hover
            ? (() => {
                const b = breakdowns[hover.i];
                const lines: { label: string; value: string }[] = [
                  { label: "年齢", value: String(b.age) },
                ];
                for (const cat of denseCats) {
                  const inc = b.income[cat] ?? 0;
                  const exp = b.expense[cat] ?? 0;
                  if (inc === 0 && exp === 0) continue;
                  const net = inc - exp;
                  const sign = net >= 0 ? "+" : "";
                  lines.push({
                    label: cat,
                    value: `${sign}${net.toLocaleString()}`,
                  });
                }
                const totalInc = denseCats.reduce((s, c) => s + (b.income[c] ?? 0), 0);
                const totalExp = denseCats.reduce((s, c) => s + (b.expense[c] ?? 0), 0);
                lines.push(
                  { label: "収入計", value: totalInc.toLocaleString() },
                  { label: "支出計", value: totalExp.toLocaleString() },
                );
                return { x: hover.mx, y: hover.my, lines };
              })()
            : null
        }
      />
    </div>
  );
}
