import { useState } from "react";
import { SaiflowProvider } from "./store";
import { ProfileBar } from "./components/ProfileBar";
import { EditorPanel } from "./components/EditorPanel";
import { ResultTable } from "./components/ResultTable";
import { LineChart } from "./components/LineChart";
import { BarChart } from "./components/BarChart";
import { AreaChartView } from "./components/AreaChartView";
import { PieChartView } from "./components/PieChartView";

type ViewMode = "table" | "line" | "bar" | "area" | "pie";

function RightPanel() {
  const [view, setView] = useState<ViewMode>("table");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-(--border)">
        {(["table", "line", "bar", "area", "pie"] as ViewMode[]).map((v) => (
          <button
            key={v}
            className={`px-2 py-0.5 text-xs rounded ${view === v ? "bg-(--terra) text-white" : "text-(--ink) opacity-50"}`}
            onClick={() => setView(v)}
          >
            {v === "table" ? "表" : v === "line" ? "折れ線" : v === "bar" ? "収支" : v === "area" ? "面" : "円"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "table" ? <ResultTable /> : view === "line" ? <LineChart /> : view === "bar" ? <BarChart /> : view === "area" ? <AreaChartView /> : <PieChartView />}
      </div>
    </div>
  );
}

export function App() {
  return (
    <SaiflowProvider>
      <div className="h-full flex flex-col">
        <ProfileBar />
        <div className="flex-1 overflow-hidden flex">
          <div className="w-96 flex-shrink-0 border-r border-(--border)">
            <EditorPanel />
          </div>
          <div className="flex-1">
            <RightPanel />
          </div>
        </div>
      </div>
    </SaiflowProvider>
  );
}
