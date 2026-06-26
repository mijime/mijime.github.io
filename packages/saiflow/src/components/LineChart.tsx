import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useSaiflowState } from "../store";

const COLORS = ["#63b3ed", "#fc8181", "#48bb78", "#f6ad55", "#9f7aea", "#ed64a6"];

export function LineChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const assetNames = [...new Set(rows.flatMap((r) => Object.keys(r.balances)))];
  const chartData = rows.map((r) =>
    Object.assign(
      {
        age: r.age,
        totalAssets: r.totalAssets,
      },
      Object.fromEntries(assetNames.map((n) => [n, r.balances[n] ?? 0])),
    ),
  );

  return (
    <div className="h-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RLineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
          <XAxis dataKey="age" tick={{ fontSize: 12 }} stroke="var(--ink)" opacity={0.5} />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--ink)"
            opacity={0.5}
            tickFormatter={(v: number) => Math.round(v).toLocaleString()}
          />
          <Tooltip />
          <Legend />
          {assetNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="totalAssets"
            name="総資産"
            stroke="var(--ink)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}
