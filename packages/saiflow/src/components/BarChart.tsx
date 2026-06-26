import { BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSaiflowState } from "../store";

export function BarChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const chartData = rows.map((r) => ({
    age: r.age,
    収入: r.totalIncome,
    支出: r.totalExpense,
  }));

  return (
    <div className="h-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
          <XAxis dataKey="age" tick={{ fontSize: 12 }} stroke="var(--ink)" opacity={0.5} />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--ink)" opacity={0.5} tickFormatter={(v: number) => Math.round(v).toString()} />
          <Tooltip />
          <Legend />
          <Bar dataKey="収入" fill="rgba(72, 187, 120, 0.7)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="支出" fill="rgba(252, 129, 129, 0.7)" radius={[3, 3, 0, 0]} />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
