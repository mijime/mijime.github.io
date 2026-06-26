import { Bar } from "react-chartjs-2";
import type { TooltipItem } from "chart.js";
import { useSaiflowState } from "../store";
import "../chart-setup";

export function BarChart() {
  const state = useSaiflowState();
  const { rows } = state;
  if (!rows || rows.length === 0) return null;

  const data = {
    labels: rows.map((r) => r.age),
    datasets: [
      {
        label: "収入",
        data: rows.map((r) => r.totalIncome),
        backgroundColor: "rgba(34,197,94,0.7)",
      },
      {
        label: "支出",
        data: rows.map((r) => -r.totalExpense),
        backgroundColor: "rgba(239,68,68,0.7)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" as const },
    plugins: {
      legend: { position: "top" as const },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<"bar">) => {
              const v = Number(ctx.raw) || 0;
              if (ctx.datasetIndex === 1) return `支出: ${Math.abs(v)}`;
              return `収入: ${v}`;
            },
          },
        },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
  };

  return (
    <div className="h-full p-4">
      <Bar data={data} options={options} />
    </div>
  );
}
