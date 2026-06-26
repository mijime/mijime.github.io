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
        backgroundColor: "rgba(72, 187, 120, 0.6)",
        hoverBackgroundColor: "rgba(72, 187, 120, 0.8)",
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: "支出",
        data: rows.map((r) => -r.totalExpense),
        backgroundColor: "rgba(252, 129, 129, 0.6)",
        hoverBackgroundColor: "rgba(252, 129, 129, 0.8)",
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { intersect: false, mode: "index" as const },
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, padding: 16, font: { size: 12 } },
      },
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
      x: { stacked: true, grid: { display: false } },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: "rgba(128,128,128,0.1)" },
        border: { display: false },
      },
    },
  };

  return (
    <div className="h-full p-4">
      <Bar data={data} options={options} />
    </div>
  );
}
