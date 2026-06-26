import { Line } from "react-chartjs-2";
import { useSaiflowState } from "../store";
import "../chart-setup";

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

export function LineChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const assetNames = Object.keys(rows[0].balances);

  const data = {
    labels: rows.map((r) => r.age),
    datasets: [
      ...assetNames.map((name, i) => ({
        label: name,
        data: rows.map((r) => r.balances[name] ?? 0),
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: "transparent",
        tension: 0.1,
        fill: false,
      })),
      {
        label: "総資産",
        data: rows.map((r) => r.totalAssets),
        borderColor: "var(--ink)",
        borderDash: [4, 2],
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" as const },
    plugins: { legend: { position: "top" as const } },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="h-full p-4">
      <Line data={data} options={options} />
    </div>
  );
}
