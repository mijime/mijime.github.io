import { useState } from "react";
import { Tabs } from "@mijime/theme/ui";
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
      <Tabs
        size="sm"
        ariaLabel="集計表示"
        value={subTab}
        onChange={setSubTab}
        options={[
          { value: "summary", label: "集計" },
          { value: "calendar", label: "カレンダー" },
        ]}
      />
      {subTab === "summary" ? (
        <SummaryView onSelectEmoji={onSelectEmoji} list={selectedList} />
      ) : (
        <CalendarView onSelectDate={onSelectDate} todayStr={todayStr} list={selectedList} />
      )}
    </div>
  );
}
