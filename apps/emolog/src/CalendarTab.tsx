import { useState } from "react";
import { today } from "./types";
import { CalendarView } from "./CalendarView";
import { ReviewView } from "./ReviewView";

interface CalendarTabProps {
  listId: number | null;
  onSelectEmoji: (emoji: string) => void;
  onSnackBar?: (message: string, action?: { label: string; onClick: () => void }) => void;
}

/**
 * カレンダーから日付を選び、その日の振り返りを見るタブ。
 * 月表示と日別表示を切り替えるが、選択日は保持して戻ったときに同じ月を開く。
 */
export function CalendarTab({ listId, onSelectEmoji, onSnackBar }: CalendarTabProps) {
  const todayStr = today();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"calendar" | "review">("calendar");

  const initialYear = selectedDate ? Number(selectedDate.slice(0, 4)) : undefined;
  const initialMonth = selectedDate ? Number(selectedDate.slice(5, 7)) - 1 : undefined;

  if (view === "review" && selectedDate) {
    return (
      <ReviewView
        date={selectedDate}
        listId={listId}
        todayStr={todayStr}
        onBack={() => setView("calendar")}
        onDateChange={setSelectedDate}
        onSelectEmoji={onSelectEmoji}
        onSnackBar={onSnackBar}
      />
    );
  }

  return (
    <CalendarView
      initialMonth={initialMonth}
      initialYear={initialYear}
      listId={listId}
      selectedDate={selectedDate}
      todayStr={todayStr}
      onSelectDate={(date) => {
        setSelectedDate(date);
        setView("review");
      }}
    />
  );
}
