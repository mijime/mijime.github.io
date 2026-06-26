import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSaiflowState } from "../store";

const COLORS = ["#63b3ed", "#fc8181", "#48bb78", "#f6ad55", "#9f7aea", "#ed64a6"];

export function PieChartView() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const best = rows.reduce((a, b) => (a.totalAssets > b.totalAssets ? a : b));
  const data = Object.entries(best.balances)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  if (data.length === 0) return null;

  return (
    <div className="h-full p-4">
      <div className="text-xs text-(--ink) opacity-50 mb-2">{best.age}歳時点（総資産最大年）</div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="60%"
            innerRadius="35%"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => (typeof v === "number" ? Math.round(v).toLocaleString() : v)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
