import { useSaiflowState } from "../store";

export function LineChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const assetNames = Object.keys(rows[0].balances);
  const colors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

  const maxVal = Math.max(...rows.map((r) => Math.max(...Object.values(r.balances), r.totalAssets), 0));
  const minVal = Math.min(...rows.map((r) => Math.min(...Object.values(r.balances), r.totalAssets), 0));
  const range = maxVal - minVal || 1;

  const padding = { top: 10, right: 20, bottom: 30, left: 50 };
  const width = 600;
  const height = 350;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const x = (i: number) => padding.left + (i / (rows.length - 1 || 1)) * plotW;
  const y = (v: number) => padding.top + plotH - ((v - minVal) / range) * plotH;

  const yTicks = 5;
  const yStep = range / yTicks;

  return (
    <div className="h-full overflow-auto p-2">
      <svg width={width} height={height} className="text-xs">
        {/* Y axis labels */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = minVal + yStep * i;
          return (
            <text key={i} x={padding.left - 5} y={y(val) + 4} textAnchor="end" fill="var(--ink)" opacity={0.6}>
              {Math.round(val)}
            </text>
          );
        })}
        {/* X axis labels */}
        {rows.filter((_, i) => i % 5 === 0 || i === rows.length - 1).map((r, i) => {
          const idx = rows.indexOf(r);
          return (
            <text key={i} x={x(idx)} y={height - 5} textAnchor="middle" fill="var(--ink)" opacity={0.6}>
              {r.age}
            </text>
          );
        })}
        {/* Asset lines */}
        {assetNames.map((name, ai) => (
          <polyline
            key={name}
            points={rows.map((r, i) => `${x(i)},${y(r.balances[name] ?? 0)}`).join(" ")}
            fill="none"
            stroke={colors[ai % colors.length]}
            strokeWidth={1.5}
          />
        ))}
        {/* Total assets line */}
        <polyline
          points={rows.map((r, i) => `${x(i)},${y(r.totalAssets)}`).join(" ")}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={2}
          strokeDasharray="4,2"
        />
        {/* Legend */}
        <g transform={`translate(${padding.left}, ${padding.top - 5})`}>
          {assetNames.map((name, ai) => (
            <g key={name} transform={`translate(${ai * 100}, 0)`}>
              <line x1={0} y1={0} x2={12} y2={0} stroke={colors[ai % colors.length]} strokeWidth={2} />
              <text x={16} y={4} fill="var(--ink)" opacity={0.8} fontSize={10}>{name}</text>
            </g>
          ))}
          <g transform={`translate(${assetNames.length * 100}, 0)`}>
            <line x1={0} y1={0} x2={12} y2={0} stroke="var(--ink)" strokeWidth={2} strokeDasharray="2,1" />
            <text x={16} y={4} fill="var(--ink)" opacity={0.8} fontSize={10}>総資産</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
