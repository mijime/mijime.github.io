import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button, IconButton } from "@mijime/theme/ui";
import { deleteEntry, getEntries, updateEntryEmoji, updateEntryNote } from "./store";
import { buildDailyReview, buildTimelineGaps, formatReviewSpan, type DailyReview } from "./review";
import { EmojiButton } from "./EmojiButton";
import { EmojiPicker } from "./EmojiPicker";
import { extractTags } from "./tags";
import { formatTime, type Entry } from "./types";

interface ReviewViewProps {
  listId?: number | null;
  todayStr: string;
  date: string;
  onDateChange: (date: string) => void;
  onBack: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSnackBar?: (message: string, action?: { label: string; onClick: () => void }) => void;
}

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
  onSnackBar,
}: ReviewViewProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editingEmojiId, setEditingEmojiId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateRef = useRef(date);
  dateRef.current = date;

  useEffect(
    () => () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    },
    [],
  );

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
  const gaps = useMemo(() => buildTimelineGaps(review.entries), [review.entries]);
  const gapByIndex = useMemo(() => new Map(gaps.map((gap) => [gap.index, gap])), [gaps]);
  const span = formatReviewSpan(review);
  const topEmoji = review.topEmoji;

  function handleStartEdit(entry: Entry) {
    if (entry.id === undefined) return;
    setEditingId(entry.id);
    setEditNote(entry.note || "");
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  async function handleSaveNote() {
    if (editingId === null) return;
    const note = editNote.trim();
    const tags = extractTags(note);
    await updateEntryNote(editingId, note || "");
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === editingId ? { ...entry, note: note || undefined, tags } : entry,
      ),
    );
    setEditingId(null);
    setEditNote("");
  }

  async function handleEmojiChange(entry: Entry, newEmoji: string) {
    if (entry.id === undefined || newEmoji === entry.emoji) return;
    await updateEntryEmoji(entry.id, newEmoji);
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, emoji: newEmoji } : item)),
    );
    setEditingEmojiId(null);
  }

  function handleDelete(entry: Entry) {
    if (entry.id === null || entry.id === undefined) return;
    setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    const timer = setTimeout(async () => {
      await deleteEntry(entry.id!);
    }, 3000);
    deleteTimerRef.current = timer;
    onSnackBar?.("削除しました", {
      label: "取り消し",
      onClick: () => {
        if (deleteTimerRef.current) {
          clearTimeout(deleteTimerRef.current);
          deleteTimerRef.current = null;
        }
        // 表示中の日付が変わっていたら、別の日の一覧には戻さない。
        if (entry.date !== dateRef.current) return;
        setEntries((prev) => {
          const restored = [...prev, entry];
          restored.sort((a, b) => a.timestamp - b.timestamp);
          return restored;
        });
      },
    });
  }

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

          <div className="emolog-history-timeline emolog-review-timeline">
            {review.entries.map((entry, index) => {
              const gap = gapByIndex.get(index);
              return (
                <Fragment key={entry.id ?? entry.timestamp}>
                  {gap && (
                    <div className="emolog-review-gap">
                      <span className="emolog-review-gap-label">{gap.label}の空き</span>
                    </div>
                  )}
                  <div className="emolog-history-entry">
                    <span className="emolog-history-time">{formatTime(entry.timestamp)}</span>
                    <EmojiButton
                      emoji={entry.emoji}
                      editing={editingEmojiId === entry.id}
                      onEdit={() => setEditingEmojiId(entry.id ?? null)}
                    />
                    <div className="emolog-review-entry-body">
                      {editingId === entry.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          className="emolog-history-note-input emolog-review-note-input"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          onBlur={handleSaveNote}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNote();
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setEditNote("");
                            }
                          }}
                          maxLength={80}
                          placeholder="メモを入力"
                        />
                      ) : (
                        <>
                          <div className="emolog-review-note-row">
                            <IconButton
                              label="メモを編集"
                              size="icon-sm"
                              className="emolog-history-note-edit"
                              onClick={() => handleStartEdit(entry)}
                            >
                              <Pencil size={12} />
                            </IconButton>
                            <p
                              className={`emolog-review-entry-note${entry.note ? "" : " emolog-history-note-empty"}`}
                              onClick={() => handleStartEdit(entry)}
                            >
                              {entry.note || "メモを追加"}
                            </p>
                          </div>
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="emolog-review-entry-tags">
                              {entry.tags.map((tag) => (
                                <span key={tag} className="emolog-tag">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <IconButton
                      label="削除"
                      size="icon"
                      className="emolog-history-delete"
                      onClick={() => handleDelete(entry)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                  {editingEmojiId === entry.id && (
                    <EmojiPicker
                      onSelect={(emoji) => handleEmojiChange(entry, emoji)}
                      onClose={() => setEditingEmojiId(null)}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
