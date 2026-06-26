import { Line } from "react-chartjs-2";
import { useSaiflowState } from "../store";
import "../chart-setup";

const COLORS = [
  { border: "rgba(99, 179, 237, 1)", bg: "rgba(99, 179, 237, 0.15)" },
  { border: "rgba(252, 129, 129, 1)", bg: "rgba(252, 129, 129, 0.15)" },
  { border: "rgba(72, 187, 120, 1)", bg: "rgba(72, 187, 120, 0.15)" },
  { border: "rgba(246, 173, 85, 1)", bg: "rgba(246, 173, 85, 0.15)" },
  { border: "rgba(159, 122, 234, 1)", bg: "rgba(159, 122, 234, 0.15)" },
  { border: "rgba(237, 100, 166, 1)", bg: "rgba(237, 100, 166, 0.15)" },
];

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
        borderColor: COLORS[i % COLORS.length].border,
        backgroundColor: COLORS[i % COLORS.length].bg,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true,
      })),
      {
        label: "総資産",
        data: rows.map((r) => r.totalAssets),
        borderColor: "rgba(100,100,100,0.8)",
        borderDash: [6, 3],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    interaction: { intersect: false, mode: "index" as const },
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, padding: 16, font: { size: 12 } },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(128,128,128,0.1)" },
        border: { display: false },
      },
    },
  };

  return (
    <div className="h-full p-4">
      <Line data={data} options={options} />
    </div>
  );
}
