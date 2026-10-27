import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, IconButton } from "@mijime/theme/ui";
import { getEntriesByDateRange } from "./store";
import type { Entry } from "./types";

interface CalendarViewProps {
  onSelectDate: (date: string) => void;
  todayStr: string;
  listId?: number | null;
  selectedDate?: string | null;
  initialYear?: number;
  initialMonth?: number;
}

function getMonthDateRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function getWeekdayStart(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function aggregateByDate(entries: Entry[]): Map<string, { emoji: string; count: number }> {
  const map = new Map<string, { counts: Record<string, number>; total: number }>();
  for (const e of entries) {
    if (!e.date) continue;
    const day = map.get(e.date) || { counts: {}, total: 0 };
    day.counts[e.emoji] = (day.counts[e.emoji] || 0) + 1;
    day.total++;
    map.set(e.date, day);
  }
  const result = new Map<string, { emoji: string; count: number }>();
  for (const [date, data] of map) {
    const sorted = Object.entries(data.counts).toSorted(([, a], [, b]) => b - a);
    result.set(date, { emoji: sorted[0][0], count: data.total });
  }
  return result;
}

export function CalendarView({
  onSelectDate,
  todayStr,
  listId,
  selectedDate,
  initialYear,
  initialMonth,
}: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(initialYear ?? today.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? today.getMonth());
  const [dayData, setDayData] = useState<Map<string, { emoji: string; count: number }>>(new Map());

  const { from, to } = useMemo(() => getMonthDateRange(year, month), [year, month]);

  useEffect(() => {
    getEntriesByDateRange(from, to, listId ?? undefined).then((entries) => {
      setDayData(aggregateByDate(entries));
    });
  }, [from, to, listId]);

  const daysInMonth = getDaysInMonth(year, month);
  const startWeekday = getWeekdayStart(year, month);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(<div key={`empty-${i}`} className="emolog-cal-cell" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const data = dayData.get(dateStr);
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;

    cells.push(
      <button
        key={dateStr}
        className={`emolog-cal-cell${isToday ? " emolog-cal-today" : ""}${isSelected ? " emolog-cal-selected" : ""}${data ? "" : " emolog-cal-empty-day"}`}
        onClick={() => onSelectDate(dateStr)}
        title={`${dateStr}${data ? ` - ${data.count}件 / ${data.emoji}` : ""}`}
      >
        <span className="emolog-cal-day">{d}</span>
        {data && (
          <span className={`emolog-cal-emoji emolog-cal-density-${Math.min(data.count, 5)}`}>
            {data.emoji}
          </span>
        )}
      </button>,
    );
  }

  return (
    <div className="emolog-calendar">
      <div className="emolog-cal-header">
        <IconButton
          label="前月"
          size="icon-sm"
          className="emolog-nav-btn"
          onClick={() => {
            if (month === 0) {
              setYear((y) => y - 1);
              setMonth(11);
            } else {
              setMonth((m) => m - 1);
            }
          }}
        >
          <ChevronLeft size={16} />
        </IconButton>
        <span className="emolog-cal-title">
          {year}年{month + 1}月
        </span>
        <IconButton
          label="翌月"
          size="icon-sm"
          className="emolog-nav-btn"
          onClick={() => {
            if (month === 11) {
              setYear((y) => y + 1);
              setMonth(0);
            } else {
              setMonth((m) => m + 1);
            }
          }}
        >
          <ChevronRight size={16} />
        </IconButton>
        {!(year === today.getFullYear() && month === today.getMonth()) && (
          <Button
            variant="secondary"
            size="sm"
            className="emolog-today-btn"
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth());
            }}
          >
            今日
          </Button>
        )}
      </div>
      <div className="emolog-cal-grid">
        {weekdays.map((w) => (
          <div key={w} className="emolog-cal-weekday">
            {w}
          </div>
        ))}
        {cells}
      </div>
    </div>
  );
}
