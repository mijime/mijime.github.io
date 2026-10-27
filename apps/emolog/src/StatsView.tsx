import { lazy, Suspense, useState } from "react";
import { CalendarDays, ChartColumn, MapPin, NotebookPen } from "lucide-react";
import { Tabs } from "@mijime/theme/ui";
import { today } from "./types";
import { CalendarView } from "./CalendarView";
import { ReviewView } from "./ReviewView";
import { SummaryView } from "./SummaryView";

const MapView = lazy(() => import("./MapView"));

interface StatsViewProps {
  selectedListId: number | null;
  onSelectEmoji: (emoji: string) => void;
  onSelectDate: (date: string) => void;
}

export function StatsView({ selectedListId, onSelectEmoji, onSelectDate }: StatsViewProps) {
  const todayStr = today();
  const [subTab, setSubTab] = useState<"summary" | "review" | "map" | "calendar">("summary");

  return (
    <div className="emolog-stats">
      <Tabs
        size="sm"
        ariaLabel="集計表示"
        value={subTab}
        onChange={setSubTab}
        options={[
          { value: "summary", label: "集計", icon: <ChartColumn size={12} /> },
          { value: "review", label: "振り返り", icon: <NotebookPen size={12} /> },
          { value: "map", label: "地図", icon: <MapPin size={12} /> },
          { value: "calendar", label: "カレンダー", icon: <CalendarDays size={12} /> },
        ]}
      />
      {subTab === "summary" ? (
        <SummaryView onSelectEmoji={onSelectEmoji} listId={selectedListId} />
      ) : subTab === "review" ? (
        <ReviewView onSelectEmoji={onSelectEmoji} listId={selectedListId} todayStr={todayStr} />
      ) : subTab === "map" ? (
        <Suspense fallback={<p className="emolog-map-hint">地図を読み込み中…</p>}>
          <MapView listId={selectedListId} />
        </Suspense>
      ) : (
        <CalendarView onSelectDate={onSelectDate} todayStr={todayStr} listId={selectedListId} />
      )}
    </div>
  );
}
