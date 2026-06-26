import { useSaiflowState } from "../store";

const COLORS = [
  "rgba(99, 179, 237, 1)",
  "rgba(252, 129, 129, 1)",
  "rgba(72, 187, 120, 1)",
  "rgba(246, 173, 85, 1)",
  "rgba(159, 122, 234, 1)",
  "rgba(237, 100, 166, 1)",
];

export function LineChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const assetNames = [...new Set(rows.flatMap((r) => Object.keys(r.balances)))];
  const padding = { top: 24, right: 24, bottom: 40, left: 56 };
  const width = Math.max(600, rows.length * 14 + padding.left + padding.right);
  const height = 350;

  const maxVal = Math.max(
    ...rows.map((r) => Math.max(...Object.values(r.balances), r.totalAssets, 0)),
    1,
  );
  const minVal = Math.min(
    ...rows.map((r) => Math.min(...Object.values(r.balances), r.totalAssets, 0)),
    0,
  );
  const range = maxVal - minVal || 1;

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const x = (i: number) => padding.left + (i / (rows.length - 1 || 1)) * plotW;
  const y = (v: number) => padding.top + plotH - ((v - minVal) / range) * plotH;

  const y0 = y(0);
  const tickCount = 5;
  const tickStep = range / tickCount;

  const xTickInterval = Math.max(1, Math.floor((rows.length - 1) / 10));
  const xTicks: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i % xTickInterval === 0 || i === rows.length - 1) xTicks.push(i);
  }

  return (
    <div className="h-full overflow-auto">
      <svg width={width} height={height} className="font-sans text-xs">
        {/* 0 line */}
        <line x1={padding.left} y1={y0} x2={padding.left + plotW} y2={y0} stroke="rgba(128,128,128,0.3)" />

        {/* Y axis ticks */}
        {Array.from({ length: tickCount + 1 }, (_, i) => {
          const v = minVal + tickStep * i;
          const vy = y(v);
          return (
            <g key={i}>
              <line x1={padding.left} y1={vy} x2={width - padding.right} y2={vy} stroke="rgba(128,128,128,0.08)" />
              <text x={padding.left - 6} y={vy + 4} textAnchor="end" fill="var(--ink)" opacity={0.5}>
                {Math.round(v).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={height - padding.bottom + 16} textAnchor="middle" fill="var(--ink)" opacity={0.5}>
            {rows[i].age}
          </text>
        ))}

        {/* Area fills */}
        {assetNames.map((name, ai) => {
          const vals = rows.map((r) => r.balances[name] ?? 0);
          const points = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          const bottom = `${x(rows.length - 1)},${y0} ${x(0)},${y0}`;
          return (
            <polygon
              key={`area-${name}`}
              points={`${points} ${bottom}`}
              fill={COLORS[ai % COLORS.length]}
              opacity={0.08}
            />
          );
        })}

        {/* Asset lines */}
        {assetNames.map((name, ai) => {
          const vals = rows.map((r) => r.balances[name] ?? 0);
          const points = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          return (
            <polyline key={name} points={points} fill="none" stroke={COLORS[ai % COLORS.length]} strokeWidth={2} />
          );
        })}

        {/* Total line */}
        <polyline
          points={rows.map((r, i) => `${x(i)},${y(r.totalAssets)}`).join(" ")}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={2}
          strokeDasharray="6,3"
          opacity={0.5}
        />

        {/* Legend */}
        <g transform={`translate(${padding.left}, 6)`}>
          {[
            ...assetNames.map((n, i) => ({ name: n, color: COLORS[i % COLORS.length] })),
            { name: "総資産", color: "var(--ink)" },
          ].map((item, i) => (
            <g key={item.name} transform={`translate(${i * 80}, 0)`}>
              <line
                x1={0} y1={0} x2={14} y2={0}
                stroke={item.color}
                strokeWidth={2}
                strokeDasharray={item.name === "総資産" ? "4,2" : undefined}
                opacity={item.name === "総資産" ? 0.5 : 1}
              />
              <text x={18} y={4} fill="var(--ink)" opacity={0.7} fontSize={11}>{item.name}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
