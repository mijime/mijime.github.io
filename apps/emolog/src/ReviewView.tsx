import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, IconButton } from "@mijime/theme/ui";
import { getEntries } from "./store";
import { buildDailyReview, formatReviewSpan, groupByHour, type DailyReview } from "./review";
import { formatTime, type Entry } from "./types";

interface ReviewViewProps {
  listId?: number | null;
  todayStr: string;
  date: string;
  onDateChange: (date: string) => void;
  onBack: () => void;
  onSelectEmoji: (emoji: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function shiftDate(date: string, delta: number): string {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + delta);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${year}/${month}/${day}（${weekdays[parsed.getDay()]}）`;
}

export function ReviewView({
  listId,
  todayStr,
  date,
  onDateChange,
  onBack,
  onSelectEmoji,
}: ReviewViewProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEntries(date, listId ?? undefined)
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, listId]);

  const review: DailyReview = useMemo(() => buildDailyReview(entries, date), [entries, date]);
  const byHour = useMemo(() => groupByHour(review.entries), [review.entries]);
  const span = formatReviewSpan(review);
  const topEmoji = review.topEmoji;
  const firstHour = review.entries[0] ? new Date(review.entries[0].timestamp).getHours() : 0;

  useEffect(() => {
    const container = scrollRef.current;
    const row = rowRefs.current.get(firstHour);
    if (container && row) {
      container.scrollTop = Math.max(0, row.offsetTop - 8);
    }
  }, [date, firstHour, review.entries.length]);

  return (
    <div className="emolog-review">
      <div className="emolog-review-header">
        <IconButton label="カレンダーへ戻る" size="icon-sm" onClick={onBack}>
          <ArrowLeft size={16} />
        </IconButton>
        <IconButton label="前日" size="icon-sm" onClick={() => onDateChange(shiftDate(date, -1))}>
          <ChevronLeft size={16} />
        </IconButton>
        <div className="emolog-review-title">
          <span>{formatDateLabel(date)}</span>
          {date === todayStr && <span className="emolog-review-today">今日</span>}
        </div>
        <IconButton
          label="翌日"
          size="icon-sm"
          disabled={date >= todayStr}
          onClick={() => onDateChange(shiftDate(date, 1))}
        >
          <ChevronRight size={16} />
        </IconButton>
        {date !== todayStr && (
          <Button variant="secondary" size="sm" onClick={() => onDateChange(todayStr)}>
            今日
          </Button>
        )}
      </div>

      {loading ? (
        <p className="emolog-review-empty">読み込み中…</p>
      ) : review.total === 0 ? (
        <p className="emolog-review-empty">この日の記録はありません</p>
      ) : (
        <>
          <div className="emolog-review-stats">
            <div className="emolog-review-stat">
              <span className="emolog-review-stat-value">{review.total}</span>
              <span className="emolog-review-stat-label">記録</span>
            </div>
            {topEmoji && (
              <button
                className="emolog-review-stat emolog-review-top"
                onClick={() => onSelectEmoji(topEmoji.emoji)}
              >
                <span className="emolog-review-stat-value">{topEmoji.emoji}</span>
                <span className="emolog-review-stat-label">いちばん多い（{topEmoji.count}回）</span>
              </button>
            )}
            {span && (
              <div className="emolog-review-stat">
                <span className="emolog-review-stat-value">{span}</span>
                <span className="emolog-review-stat-label">時間帯</span>
              </div>
            )}
          </div>

          {review.tags.length > 0 && (
            <div className="emolog-review-tags">
              {review.tags.map((tag) => (
                <span key={tag.tag} className="emolog-tag">
                  #{tag.tag} {tag.count}
                </span>
              ))}
            </div>
          )}

          <div className="emolog-daycal" ref={scrollRef}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="emolog-daycal-row"
                ref={(element) => {
                  if (element) {
                    rowRefs.current.set(hour, element);
                  } else {
                    rowRefs.current.delete(hour);
                  }
                }}
              >
                <span className="emolog-daycal-hour">{String(hour).padStart(2, "0")}:00</span>
                <div className="emolog-daycal-slot">
                  {(byHour.get(hour) ?? []).map((entry) => (
                    <div key={entry.id ?? entry.timestamp} className="emolog-daycal-entry">
                      <span className="emolog-daycal-time">{formatTime(entry.timestamp)}</span>
                      <span className="emolog-daycal-emoji">{entry.emoji}</span>
                      <div className="emolog-daycal-body">
                        {entry.note ? <p className="emolog-daycal-note">{entry.note}</p> : null}
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="emolog-daycal-tags">
                            {entry.tags.map((tag) => (
                              <span key={tag} className="emolog-tag">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
