import { Fragment, useState, useEffect, useRef, useCallback } from "react";
import { Copy, MapPin, Pencil, Search, Trash2, X } from "lucide-react";
import { IconButton } from "@mijime/theme/ui";
import {
  getEntriesByDateRange,
  getAllEntries,
  deleteEntry,
  updateEntryNote,
  updateEntryEmoji,
  getAllTags,
} from "./store";
import { EmojiButton } from "./EmojiButton";
import { EmojiPicker } from "./EmojiPicker";
import { extractTags } from "./tags";
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
  selectedListId: number | null;
  filterEmoji: string | null;
  onFilterEmoji: (emoji: string | null) => void;
  filterTag: string | null;
  onFilterTag: (tag: string | null) => void;
  onSnackBar: (message: string, action?: { label: string; onClick: () => void }) => void;
  refreshKey?: number;
}

export function HistoryView({
  selectedListId,
  filterEmoji,
  onFilterEmoji,
  filterTag,
  onFilterTag,
  onSnackBar,
  refreshKey = 0,
}: HistoryViewProps) {
  const todayStr = today();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loadedUntil, setLoadedUntil] = useState<string>(todayStr);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editingEmojiId, setEditingEmojiId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    },
    [],
  );

  const loadEntries = useCallback(
    async (toDate: string, append: boolean) => {
      if (selectedListId === null) return;
      setLoading(true);
      if (filterEmoji || filterTag || normalizedQuery) {
        // フィルタ中は読み込み済みページではなく全履歴を対象にする。
        const fresh = await getAllEntries(selectedListId);
        setEntries(fresh);
        setHasMore(false);
        setLoading(false);
        return;
      }
      const start = new Date(toDate);
      start.setDate(start.getDate() - (PAGE_DAYS - 1));
      const from = getFullDate(start);
      const fresh = await getEntriesByDateRange(from, toDate, selectedListId ?? undefined);
      if (append) {
        setEntries((prev) => {
          const existing = new Set(prev.map((e) => e.id));
          return [...prev, ...fresh.filter((e) => !existing.has(e.id))];
        });
      } else {
        setEntries(fresh);
      }
      setHasMore(from > "2020-01-01");
      setLoading(false);
    },
    [selectedListId, filterEmoji, filterTag, normalizedQuery],
  );

  // Initial load and reload on filter/list change
  useEffect(() => {
    setLoadedUntil(todayStr);
    loadEntries(todayStr, false);
  }, [selectedListId, filterEmoji, filterTag, normalizedQuery, refreshKey]);

  function loadMore() {
    if (filterEmoji || filterTag || normalizedQuery || !hasMore || loading) return;
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
    const tags = extractTags(note);
    await updateEntryNote(editingId, note || "");
    setEntries((prev) =>
      prev.map((e) => (e.id === editingId ? { ...e, note: note || undefined, tags } : e)),
    );
    setEditingId(null);
    setEditNote("");
    if (selectedListId !== null) {
      getAllTags(selectedListId)
        .then(setAllTags)
        .catch(() => undefined);
    }
  }

  async function handleEmojiChange(entry: Entry, newEmoji: string) {
    if (entry.id === null || entry.id === undefined || newEmoji === entry.emoji) return;
    await updateEntryEmoji(entry.id, newEmoji);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, emoji: newEmoji } : e)));
    setEditingEmojiId(null);
  }

  useEffect(() => {
    const el = historyRef.current?.closest(".emolog-content") as HTMLElement | null;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loading) {
        loadMore();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadedUntil, hasMore, loading, selectedListId, filterEmoji, filterTag, normalizedQuery]);

  useEffect(() => {
    if (selectedListId === null) {
      setAllTags([]);
      return;
    }
    getAllTags(selectedListId)
      .then(setAllTags)
      .catch(() => setAllTags([]));
  }, [selectedListId, refreshKey]);

  const filteredEntries = entries.filter(
    (entry) =>
      (!filterEmoji || entry.emoji === filterEmoji) &&
      (!filterTag || entry.tags?.includes(filterTag)) &&
      (!normalizedQuery ||
        entry.note?.toLowerCase().includes(normalizedQuery) ||
        entry.emoji.includes(normalizedQuery) ||
        entry.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery))),
  );
  const groupedEntries = groupByDate(filteredEntries);
  const dateLabels = Object.keys(groupedEntries).toSorted((a, b) => b.localeCompare(a));

  async function copyLog() {
    if (dateLabels.length === 0) {
      await navigator.clipboard.writeText("📋 記録なし");
      return;
    }
    const lines: string[] = [];
    for (const date of dateLabels) {
      lines.push(`📅 ${formatDateLabel(date)}`);
      for (const e of groupedEntries[date].toSorted((a, b) => b.timestamp - a.timestamp)) {
        const time = formatTime(e.timestamp);
        const note = e.note ? ` (${e.note})` : "";
        lines.push(`  ${time} ${e.emoji}${note}`);
      }
    }
    await navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="emolog-history" ref={historyRef}>
      <div className="emolog-history-search">
        <Search size={14} />
        <input
          type="search"
          className="emolog-history-search-input"
          value={query}
          placeholder="メモ・タグを検索"
          aria-label="履歴を検索"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <IconButton label="検索をクリア" size="icon" onClick={() => setQuery("")}>
            <X size={14} />
          </IconButton>
        )}
      </div>

      {/* Filter bar */}
      <div className="emolog-history-toolbar">
        {filterEmoji && (
          <div className="emolog-history-filter">
            <span style={{ alignItems: "center", display: "inline-flex", gap: "4px" }}>
              <Search size={12} /> {filterEmoji}
            </span>
            <IconButton label="フィルタ解除" size="icon" onClick={() => onFilterEmoji(null)}>
              <X size={14} />
            </IconButton>
          </div>
        )}
        {filterTag && (
          <div className="emolog-history-filter">
            <span style={{ alignItems: "center", display: "inline-flex", gap: "4px" }}>
              <Search size={12} /> #{filterTag}
            </span>
            <IconButton label="タグフィルタ解除" size="icon" onClick={() => onFilterTag(null)}>
              <X size={14} />
            </IconButton>
          </div>
        )}
        <IconButton
          label="クリップボードにコピー"
          size="icon"
          className="emolog-history-copy"
          onClick={copyLog}
        >
          <Copy size={14} />
        </IconButton>
      </div>

      {allTags.length > 0 && (
        <div className="emolog-history-tag-bar">
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`emolog-history-tag${filterTag === tag ? " emolog-history-tag-active" : ""}`}
              onClick={() => onFilterTag(filterTag === tag ? null : tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="emolog-history-timeline">
        {dateLabels.length === 0 ? (
          <p className="emolog-history-empty">
            {filterEmoji || filterTag || normalizedQuery
              ? "条件に一致する記録はありません"
              : "この期間の記録はありません"}
          </p>
        ) : (
          dateLabels.map((date) => (
            <div key={date} className="emolog-history-group">
              <div className="emolog-history-date">
                {formatDateLabel(date)}
                {date === todayStr && <span className="emolog-history-today">今日</span>}
              </div>
              {groupedEntries[date]
                .toSorted((a, b) => b.timestamp - a.timestamp)
                .map((entry) => (
                  <Fragment key={entry.id ?? entry.timestamp}>
                    <div className="emolog-history-entry">
                      <span className="emolog-history-time">{formatTime(entry.timestamp)}</span>
                      <EmojiButton
                        emoji={entry.emoji}
                        active={filterEmoji === entry.emoji}
                        editing={editingEmojiId === entry.id}
                        title="クリックでフィルター、長押し・ダブルクリックで絵文字を変更"
                        onClick={() => {
                          if (filterEmoji === entry.emoji) {
                            onFilterEmoji(null);
                          } else {
                            onFilterEmoji(entry.emoji);
                          }
                        }}
                        onEdit={() => setEditingEmojiId(entry.id ?? null)}
                      />
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
                          maxLength={80}
                          placeholder="メモを入力"
                        />
                      ) : (
                        <div className="emolog-history-main">
                          <div className="emolog-history-note-row">
                            <IconButton
                              label="メモを編集"
                              size="icon-sm"
                              className="emolog-history-note-edit"
                              onClick={() => handleStartEdit(entry)}
                            >
                              <Pencil size={12} />
                            </IconButton>
                            <span
                              className={`emolog-history-note${entry.note ? "" : " emolog-history-note-empty"}`}
                              onClick={() => handleStartEdit(entry)}
                            >
                              {entry.note || "メモを追加"}
                            </span>
                          </div>
                          {(entry.tags?.length ?? 0) > 0 && (
                            <div className="emolog-history-entry-meta">
                              {entry.tags?.map((tag) => (
                                <button
                                  key={tag}
                                  className={`emolog-history-tag${filterTag === tag ? " emolog-history-tag-active" : ""}`}
                                  onClick={() => onFilterTag(filterTag === tag ? null : tag)}
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {entry.location && (
                        <a
                          className="emolog-history-location"
                          href={`https://www.google.com/maps?q=${entry.location.lat},${entry.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="地図で開く"
                          title="地図で開く"
                        >
                          <MapPin size={14} />
                        </a>
                      )}
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
                ))}
            </div>
          ))
        )}
        {loading && <div className="emolog-history-loading">読み込み中…</div>}
      </div>
    </div>
  );
}
