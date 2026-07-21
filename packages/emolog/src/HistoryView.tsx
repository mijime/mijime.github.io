import { useState, useEffect, useRef, useCallback } from "react";
import { getEntriesByDateRange, deleteEntry, updateEntryNote, updateEntryEmoji } from "./store";
import { type Entry, today, formatTime } from "./types";

const PAGE_DAYS = 7;

function getFullDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${m}/${d}（${weekdays[date.getDay()]}）`;
}

function groupByDate(list: Entry[]): Record<string, Entry[]> {
  return list.reduce<Record<string, Entry[]>>((acc, entry) => {
    (acc[entry.date] ??= []).push(entry);
    return acc;
  }, {});
}

interface HistoryViewProps {
  selectedList: string;
  filterEmoji: string | null;
  onFilterEmoji: (emoji: string | null) => void;
  targetDate: string | null;
  onClearTargetDate: () => void;
  onSnackBar: (message: string, action?: { label: string; onClick: () => void }) => void;
}

export function HistoryView({
  selectedList,
  filterEmoji,
  onFilterEmoji,
  targetDate,
  onClearTargetDate,
  onSnackBar,
}: HistoryViewProps) {
  const todayStr = today();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadedUntil, setLoadedUntil] = useState<string>(todayStr);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editingEmojiId, setEditingEmojiId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    },
    [],
  );

  const loadEntries = useCallback(
    async (toDate: string, append: boolean) => {
      if (!selectedList) return;
      setLoading(true);
      const start = new Date(toDate);
      start.setDate(start.getDate() - (PAGE_DAYS - 1));
      const from = getFullDate(start);
      const fresh = await getEntriesByDateRange(from, toDate, selectedList);
      const filtered = filterEmoji ? fresh.filter((e) => e.emoji === filterEmoji) : fresh;
      if (append) {
        setEntries((prev) => {
          const existing = new Set(prev.map((e) => e.id));
          return [...prev, ...filtered.filter((e) => !existing.has(e.id))];
        });
      } else {
        setEntries(filtered);
      }
      setHasMore(from > "2020-01-01");
      setLoading(false);
    },
    [selectedList, filterEmoji],
  );

  // Initial load and reload on filter/list/targetDate change
  useEffect(() => {
    const focusDate = targetDate || todayStr;
    setLoadedUntil(focusDate);
    loadEntries(focusDate, false);
    if (targetDate) onClearTargetDate();
  }, [selectedList, filterEmoji, targetDate]);

  function loadMore() {
    const next = new Date(loadedUntil);
    next.setDate(next.getDate() - PAGE_DAYS);
    const nextDate = getFullDate(next);
    setLoadedUntil(nextDate);
    loadEntries(nextDate, true);
  }

  async function handleDelete(entry: Entry) {
    if (entry.id === null || entry.id === undefined) return;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    const timer = setTimeout(async () => {
      await deleteEntry(entry.id!);
    }, 3000);
    deleteTimerRef.current = timer;
    onSnackBar("削除しました", {
      label: "取り消し",
      onClick: () => {
        if (deleteTimerRef.current) {
          clearTimeout(deleteTimerRef.current);
          deleteTimerRef.current = null;
        }
        setEntries((prev) => {
          const restored = [...prev, entry];
          restored.sort((a, b) => a.timestamp - b.timestamp);
          return restored;
        });
      },
    });
  }

  function handleStartEdit(entry: Entry) {
    setEditingId(entry.id ?? null);
    setEditNote(entry.note || "");
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  async function handleSaveNote() {
    if (editingId === null) return;
    const note = editNote.trim();
    await updateEntryNote(editingId, note || "");
    setEntries((prev) =>
      prev.map((e) => (e.id === editingId ? { ...e, note: note || undefined } : e)),
    );
    setEditingId(null);
    setEditNote("");
  }

  async function handleEmojiChange(entry: Entry, newEmoji: string) {
    if (entry.id === null || entry.id === undefined || newEmoji === entry.emoji) return;
    await updateEntryEmoji(entry.id, newEmoji);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, emoji: newEmoji } : e)));
    setEditingEmojiId(null);
  }

  // Scroll to load more
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loading) {
        loadMore();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadedUntil, hasMore, loading, selectedList, filterEmoji]);

  const filteredEntries = filterEmoji ? entries.filter((e) => e.emoji === filterEmoji) : entries;
  const groupedEntries = groupByDate(filteredEntries);
  const dateLabels = Object.keys(groupedEntries).toSorted();

  async function copyLog() {
    if (dateLabels.length === 0) {
      await navigator.clipboard.writeText("📋 記録なし");
      return;
    }
    const lines: string[] = [];
    for (const date of dateLabels) {
      lines.push(`📅 ${formatDateLabel(date)}`);
      for (const e of groupedEntries[date]) {
        const time = formatTime(e.timestamp);
        const note = e.note ? ` (${e.note})` : "";
        lines.push(`  ${time} ${e.emoji}${note}`);
      }
    }
    await navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="emolog-history" ref={scrollRef}>
      {/* Filter bar */}
      <div className="emolog-history-toolbar">
        {filterEmoji && (
          <div className="emolog-history-filter">
            <span>🔍 {filterEmoji}</span>
            <button onClick={() => onFilterEmoji(null)}>×</button>
          </div>
        )}
        <button onClick={copyLog} className="emolog-history-copy" title="クリップボードにコピー">
          📋
        </button>
      </div>

      {/* Timeline */}
      <div className="emolog-history-timeline">
        {dateLabels.length === 0 ? (
          <p className="emolog-history-empty">この期間の記録はありません</p>
        ) : (
          dateLabels.map((date) => (
            <div key={date} className="emolog-history-group">
              <div className="emolog-history-date">
                {formatDateLabel(date)}
                {date === todayStr && <span className="emolog-history-today">今日</span>}
              </div>
              {groupedEntries[date].map((entry) => (
                <div key={entry.id} className="emolog-history-entry">
                  <span className="emolog-history-time">{formatTime(entry.timestamp)}</span>
                  {editingEmojiId === entry.id ? (
                    <div className="emolog-history-emoji-edit">
                      <input
                        type="text"
                        className="emolog-history-emoji-input"
                        defaultValue={entry.emoji}
                        autoFocus
                        onBlur={(e) => handleEmojiChange(entry, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEmojiChange(entry, e.currentTarget.value);
                          if (e.key === "Escape") setEditingEmojiId(null);
                        }}
                      />
                    </div>
                  ) : (
                    <span
                      className={`emolog-history-emoji${filterEmoji === entry.emoji ? " emolog-history-emoji-active" : ""}`}
                      onClick={() => {
                        if (filterEmoji === entry.emoji) {
                          onFilterEmoji(null);
                        } else {
                          onFilterEmoji(entry.emoji);
                        }
                      }}
                      onDoubleClick={() => setEditingEmojiId(entry.id ?? null)}
                      title="クリックでフィルター、ダブルクリックで絵文字を編集"
                    >
                      {entry.emoji}
                    </span>
                  )}
                  {editingId === entry.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
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
                      className="emolog-history-note-input"
                      maxLength={40}
                      placeholder="メモを入力"
                    />
                  ) : (
                    <span
                      className={`emolog-history-note${entry.note ? "" : " emolog-history-note-empty"}`}
                      onClick={() => handleStartEdit(entry)}
                    >
                      {entry.note || "＋"}
                    </span>
                  )}
                  <button
                    className="emolog-history-delete"
                    onClick={() => handleDelete(entry)}
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
        {loading && <div className="emolog-history-loading">読み込み中…</div>}
      </div>
    </div>
  );
}
