import { Line } from "react-chartjs-2";
import { useSaiflowState } from "../store";
import "../chart-setup";

export function LineChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const data = {
    labels: rows.map((r) => r.age),
    datasets: [
      {
        label: "収入",
        data: rows.map((r) => r.totalIncome),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.1)",
        tension: 0.1,
        fill: false,
      },
      {
        label: "支出",
        data: rows.map((r) => r.totalExpense),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.1)",
        tension: 0.1,
        fill: false,
      },
      {
        label: "収支",
        data: rows.map((r) => r.totalIncome - r.totalExpense),
        borderColor: "#3b82f6",
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
