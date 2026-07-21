import { useState } from "react";
import { CalendarView } from "./CalendarView";
import { SummaryView } from "./SummaryView";

interface StatsViewProps {
  selectedList: string;
  onSelectEmoji: (emoji: string) => void;
  onSelectDate: (date: string) => void;
}

export function StatsView({ selectedList, onSelectEmoji, onSelectDate }: StatsViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [subTab, setSubTab] = useState<"summary" | "calendar">("summary");

  return (
    <div className="emolog-stats">
      <div className="emolog-stats-subtabs">
        <button
          className={`emolog-stats-subtab${subTab === "summary" ? " emolog-stats-subtab-active" : ""}`}
          onClick={() => setSubTab("summary")}
        >
          集計
        </button>
        <button
          className={`emolog-stats-subtab${subTab === "calendar" ? " emolog-stats-subtab-active" : ""}`}
          onClick={() => setSubTab("calendar")}
        >
          カレンダー
        </button>
      </div>
      {subTab === "summary" ? (
        <SummaryView onSelectEmoji={onSelectEmoji} list={selectedList} />
      ) : (
        <CalendarView onSelectDate={onSelectDate} todayStr={todayStr} list={selectedList} />
      )}
    </div>
  );
}
