import { useState } from "react";
import { SaiflowProvider } from "./store";
import { ProfileBar } from "./components/ProfileBar";
import { EditorPanel } from "./components/EditorPanel";
import { ResultTable } from "./components/ResultTable";
import { BarChart } from "./components/BarChart";
import { LineChart } from "./components/LineChart";

type ViewMode = "table" | "line" | "bar";

function RightPanel() {
  const [view, setView] = useState<ViewMode>("table");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-(--border)">
        {(["table", "line", "bar"] as ViewMode[]).map((v) => (
          <button
            key={v}
            className={`px-2 py-0.5 text-xs rounded ${view === v ? "bg-(--terra) text-white" : "text-(--ink) opacity-50"}`}
            onClick={() => setView(v)}
          >
            {v === "table" ? "収支表" : v === "line" ? "資産推移" : "収支比較"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "table" ? <ResultTable /> : view === "line" ? <LineChart /> : <BarChart />}
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
