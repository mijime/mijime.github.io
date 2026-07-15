import { useState, useEffect, useMemo } from "react"
import { getEntriesByDateRange } from "./store"
import type { Entry } from "./types"

interface CalendarViewProps {
  onSelectDate: (date: string) => void
  todayStr: string
  list?: string
}

function getMonthDateRange(
  year: number,
  month: number,
): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { from, to }
}

function getWeekdayStart(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function aggregateByDate(
  entries: Entry[],
): Map<string, { emoji: string; count: number }> {
  const map = new Map<
    string,
    { counts: Record<string, number>; total: number }
  >()
  for (const e of entries) {
    if (!e.date) continue
    const day = map.get(e.date) || { counts: {}, total: 0 }
    day.counts[e.emoji] = (day.counts[e.emoji] || 0) + 1
    day.total++
    map.set(e.date, day)
  }
  const result = new Map<string, { emoji: string; count: number }>()
  for (const [date, data] of map) {
    const sorted = Object.entries(data.counts).sort(([, a], [, b]) => b - a)
    result.set(date, { emoji: sorted[0][0], count: data.total })
  }
  return result
}

export function CalendarView({ onSelectDate, todayStr, list }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [dayData, setDayData] = useState<
    Map<string, { emoji: string; count: number }>
  >(new Map())

  const { from, to } = useMemo(() => getMonthDateRange(year, month), [year, month])

  useEffect(() => {
    getEntriesByDateRange(from, to, list).then((entries) => {
      setDayData(aggregateByDate(entries))
    })
  }, [from, to, list])

  const daysInMonth = getDaysInMonth(year, month)
  const startWeekday = getWeekdayStart(year, month)
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"]

  const cells: React.ReactNode[] = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push(<div key={`empty-${i}`} className="emolog-cal-cell" />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    const data = dayData.get(dateStr)
    const isToday = dateStr === todayStr

    cells.push(
      <button
        key={dateStr}
        className={`emolog-cal-cell${isToday ? " emolog-cal-today" : ""}${!data ? " emolog-cal-empty-day" : ""}`}
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
    )
  }

  return (
    <div className="emolog-calendar">
      <div className="emolog-cal-header">
        <button
          onClick={() => {
            if (month === 0) {
              setYear((y) => y - 1)
              setMonth(11)
            } else {
              setMonth((m) => m - 1)
            }
          }}
          className="emolog-nav-btn"
          aria-label="前月"
        >
          ←
        </button>
        <span className="emolog-cal-title">
          {year}年{month + 1}月
        </span>
        <button
          onClick={() => {
            if (month === 11) {
              setYear((y) => y + 1)
              setMonth(0)
            } else {
              setMonth((m) => m + 1)
            }
          }}
          className="emolog-nav-btn"
          aria-label="翌月"
        >
          →
        </button>
        {!(year === today.getFullYear() && month === today.getMonth()) && (
          <button
            onClick={() => {
              setYear(today.getFullYear())
              setMonth(today.getMonth())
            }}
            className="emolog-today-btn"
          >
            今日
          </button>
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
  )
}
