import { lazy, Suspense, useState } from "react";
import { ChartColumn, MapPin } from "lucide-react";
import { Tabs } from "@mijime/theme/ui";
import { SummaryView } from "./SummaryView";

const MapView = lazy(() => import("./MapView"));

interface StatsViewProps {
  selectedListId: number | null;
  onSelectEmoji: (emoji: string) => void;
}

export function StatsView({ selectedListId, onSelectEmoji }: StatsViewProps) {
  const [subTab, setSubTab] = useState<"summary" | "map">("summary");

  return (
    <div className="emolog-stats">
      <Tabs
        size="sm"
        ariaLabel="集計表示"
        value={subTab}
        onChange={setSubTab}
        options={[
          { value: "summary", label: "集計", icon: <ChartColumn size={12} /> },
          { value: "map", label: "地図", icon: <MapPin size={12} /> },
        ]}
      />
      {subTab === "summary" ? (
        <SummaryView onSelectEmoji={onSelectEmoji} listId={selectedListId} />
      ) : (
        <Suspense fallback={<p className="emolog-map-hint">地図を読み込み中…</p>}>
          <MapView listId={selectedListId} />
        </Suspense>
      )}
    </div>
  );
}
