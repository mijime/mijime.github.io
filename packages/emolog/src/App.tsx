import { useState, useEffect, useRef, useCallback } from "react";
import {
  getEntriesByDateRange,
  addEntry,
  deleteEntry,
  updateEntryNote,
  getLists,
  addList,
  renameList,
  removeList,
  ensureDefaultList,
} from "./store";
import { type Entry, today, formatTime } from "./types";
import type { ListDef } from "./store";
import { CalendarView } from "./CalendarView";
import { SummaryView } from "./SummaryView";
import "emoji-picker-element";

const FAV_KEY = "emolog-favs";
const MAX_FAV = 8;
const TIMELINE_DAYS = 3;

function getFavMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || "{}");
  } catch {
    return {};
  }
}

function getTopFavorites(): string[] {
  const map = getFavMap();
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_FAV)
    .map(([emoji]) => emoji);
}

function incrementFavorite(emoji: string) {
  const map = getFavMap();
  map[emoji] = (map[emoji] || 0) + 1;
  localStorage.setItem(FAV_KEY, JSON.stringify(map));
}

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

export function App() {
  const todayStr = today();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => getTopFavorites());
  const [viewMode, setViewMode] = useState<"timeline" | "calendar" | "summary">("timeline");
  const [selectedList, setSelectedList] = useState<string>("");
  const [lists, setLists] = useState<ListDef[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [filterEmoji, setFilterEmoji] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const refreshFavorites = useCallback(() => {
    setFavorites(getTopFavorites());
  }, []);

  // Load lists on mount
  useEffect(() => {
    setListError(null);
    ensureDefaultList()
      .then((defaultName) => {
        setSelectedList(defaultName);
        return getLists();
      })
      .then(setLists)
      .catch((err) => {
        console.error("list loading error:", err);
        setListError(err?.message || String(err));
      });
  }, []);

  // Refresh lists after changes
  const refreshLists = useCallback(() => {
    getLists().then(setLists);
  }, []);

  // Load entries for TIMELINE_DAYS window
  useEffect(() => {
    if (!selectedList) return;
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - (TIMELINE_DAYS - 1));
    const startStr = getFullDate(start);
    getEntriesByDateRange(startStr, selectedDate, selectedList).then(setEntries);
  }, [selectedDate, selectedList]);

  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const emoji = detail.unicode || detail.emoji?.native || detail.emoji;
      if (emoji) {
        handleTap(emoji);
      }
    };
    el.addEventListener("emoji-click", handler);
    return () => el.removeEventListener("emoji-click", handler);
  }, [selectedDate, showPicker, selectedList]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Focus rename input
  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  async function handleTap(emoji: string) {
    const id = await addEntry({
      date: selectedDate,
      timestamp: Date.now(),
      emoji,
      list: selectedList || undefined,
    });
    setEntries((prev) => [
      ...prev,
      { id, date: selectedDate, timestamp: Date.now(), emoji, list: selectedList || undefined },
    ]);
    incrementFavorite(emoji);
    refreshFavorites();
  }

  async function handleDelete(id: number) {
    await deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
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

  function handleCancelEdit() {
    setEditingId(null);
    setEditNote("");
  }

  function handlePrevDay() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(getFullDate(d));
  }

  function handleNextDay() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(getFullDate(d));
  }

  function handleSelectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setViewMode("timeline");
  }

  function handleFilterEmoji(emoji: string) {
    setFilterEmoji((prev) => (prev === emoji ? null : emoji));
  }

  function handleSelectEmojiFromSummary(emoji: string) {
    setFilterEmoji(emoji);
    setViewMode("timeline");
  }

  async function copyLog() {
    const dateGroups = groupByDate(entries);
    const dateKeys = Object.keys(dateGroups).sort();
    if (dateKeys.length === 0) {
      await navigator.clipboard.writeText("📋 記録なし");
      return;
    }
    const lines: string[] = [];
    for (const date of dateKeys) {
      lines.push(`📅 ${formatDateLabel(date)}`);
      for (const e of dateGroups[date]) {
        const time = formatTime(e.timestamp);
        const note = e.note ? ` (${e.note})` : "";
        lines.push(`  ${time} ${e.emoji}${note}`);
      }
    }
    await navigator.clipboard.writeText(lines.join("\n"));
  }

  function groupByDate(list: Entry[]): Record<string, Entry[]> {
    return list.reduce<Record<string, Entry[]>>((acc, entry) => {
      (acc[entry.date] ??= []).push(entry);
      return acc;
    }, {});
  }

  // ── List management ──

  async function handleAddList() {
    const name = window.prompt("新しいリスト名");
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (lists.some((l) => l.name === trimmed)) {
      alert("同じ名前のリストが既にあります");
      return;
    }
    await addList(trimmed);
    await refreshLists();
    setSelectedList(trimmed);
  }

  async function handleRemoveList(name: string) {
    if (lists.length <= 1) {
      alert("最後のリストは削除できません");
      return;
    }
    if (!window.confirm(`「${name}」を削除しますか？\nこのリストの記録は「リストなし」になります`))
      return;
    await removeList(name);
    await refreshLists();
    if (selectedList === name) {
      const remaining = await getLists();
      setSelectedList(remaining[0]?.name || "メイン");
    }
    setMenuOpen(null);
  }

  function handleStartRename(name: string) {
    setRenaming(name);
    setRenameValue(name);
    setMenuOpen(null);
  }

  async function handleCommitRename() {
    const oldName = renaming;
    if (!oldName) return;
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      setRenaming(null);
      return;
    }
    if (lists.some((l) => l.name === newName && l.name !== oldName)) {
      alert("同じ名前のリストが既にあります");
      return;
    }
    await renameList(oldName, newName);
    await refreshLists();
    if (selectedList === oldName) {
      setSelectedList(newName);
    }
    setRenaming(null);
  }

  const isToday = selectedDate === todayStr;
  const filteredEntries = filterEmoji ? entries.filter((e) => e.emoji === filterEmoji) : entries;
  const groupedEntries = groupByDate(filteredEntries);
  const dateLabels = Object.keys(groupedEntries).sort();
  const hasAnyEntry = dateLabels.length > 0;

  return (
    <div className="emolog">
      {/* ── リストタブ ── */}
      <div className="emolog-lists">
        {listError ? (
          <div className="emolog-list-placeholder" style={{ color: "#e74c3c" }}>
            エラー: {listError}
          </div>
        ) : lists.length === 0 ? (
          <div className="emolog-list-placeholder">読み込み中…</div>
        ) : (
          <>
            <div className="emolog-list-tabs">
              {lists.map((l) => (
                <div key={l.name} className="emolog-list-tab-wrap">
                  {renaming === l.name ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      className="emolog-list-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleCommitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitRename();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      maxLength={20}
                    />
                  ) : (
                    <button
                      className={`emolog-list-tab${l.name === selectedList ? " emolog-list-active" : ""}`}
                      onClick={() => setSelectedList(l.name)}
                    >
                      {l.name === selectedList && <span className="emolog-list-indicator">📋</span>}
                      {l.name}
                    </button>
                  )}
                  {l.name === selectedList && renaming !== l.name && (
                    <div
                      className="emolog-list-menu-wrap"
                      ref={menuOpen === l.name ? menuRef : undefined}
                    >
                      <button
                        className="emolog-list-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === l.name ? null : l.name);
                        }}
                      >
                        ·
                      </button>
                      {menuOpen === l.name && (
                        <div className="emolog-list-menu">
                          <button onClick={() => handleStartRename(l.name)}>✏️ 名前を変更</button>
                          <button
                            className="emolog-list-menu-del"
                            onClick={() => handleRemoveList(l.name)}
                          >
                            🗑️ 削除
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button className="emolog-list-add" onClick={handleAddList} title="リストを追加">
              ＋
            </button>
          </>
        )}
      </div>

      {/* ── 日付ナビ ── */}
      <div className="emolog-date-nav">
        {viewMode === "timeline" ? (
          <>
            <button onClick={handlePrevDay} className="emolog-nav-btn" aria-label="前日">
              ←
            </button>
            <span className="emolog-date-label">{formatDateLabel(selectedDate)}</span>
            <button
              onClick={handleNextDay}
              className="emolog-nav-btn"
              disabled={isToday}
              aria-label="翌日"
            >
              →
            </button>
          </>
        ) : viewMode === "calendar" ? (
          <span className="emolog-date-label">📅 カレンダー</span>
        ) : (
          <span className="emolog-date-label">📊 集計</span>
        )}
        <button
          onClick={() =>
            setViewMode((v) =>
              v === "timeline" ? "calendar" : v === "calendar" ? "summary" : "timeline",
            )
          }
          className={`emolog-nav-btn emolog-view-toggle${viewMode === "calendar" || viewMode === "summary" ? " emolog-view-active" : ""}`}
          title={
            viewMode === "timeline"
              ? "カレンダー表示"
              : viewMode === "calendar"
                ? "集計表示"
                : "タイムラインに戻る"
          }
        >
          {viewMode === "timeline" ? "📅" : viewMode === "calendar" ? "📊" : "📋"}
        </button>
        {viewMode === "timeline" && (
          <button onClick={copyLog} className="emolog-copy-btn" title="コピー">
            📋
          </button>
        )}
      </div>

      {viewMode === "calendar" ? (
        <CalendarView onSelectDate={handleSelectDate} todayStr={todayStr} list={selectedList} />
      ) : viewMode === "summary" ? (
        <SummaryView onSelectEmoji={handleSelectEmojiFromSummary} list={selectedList} />
      ) : (
        <>
          {/* ── フィルター表示 ── */}
          {filterEmoji && (
            <div className="emolog-filter-bar">
              <span className="emolog-filter-label">🔍 {filterEmoji} のみ表示</span>
              <button className="emolog-filter-clear" onClick={() => setFilterEmoji(null)}>
                ×
              </button>
            </div>
          )}

          {/* ── 絵文字ピッカー ── */}
          <div className="emolog-picker">
            {favorites.length > 0 && (
              <div className="emolog-favs">
                {favorites.map((emoji) => (
                  <button key={emoji} className="emolog-fav-btn" onClick={() => handleTap(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="emolog-picker-toggle">
              <button className="emolog-toggle-btn" onClick={() => setShowPicker((v) => !v)}>
                {showPicker ? "▲ 閉じる" : "＋ 絵文字を選ぶ"}
              </button>
            </div>
            {showPicker && (
              <div className="emolog-picker-panel">
                <emoji-picker ref={pickerRef} class="emolog-picker-element" />
              </div>
            )}
          </div>

          {/* ── タイムライン ── */}
          <div className="emolog-timeline">
            {!hasAnyEntry ? (
              <p className="emolog-empty">
                {selectedDate === todayStr
                  ? "絵文字をタップして気持ちを記録しよう 👆"
                  : "この期間の記録はありません"}
              </p>
            ) : (
              dateLabels.map((date) => (
                <div key={date} className="emolog-timeline-group">
                  <div className="emolog-timeline-date">
                    {formatDateLabel(date)}
                    {date === todayStr && <span className="emolog-timeline-today">今日</span>}
                  </div>
                  {groupedEntries[date].map((entry) => (
                    <div key={entry.id} className="emolog-timeline-entry">
                      <span className="emolog-entry-time">{formatTime(entry.timestamp)}</span>
                      <span
                        className={`emolog-entry-emoji${filterEmoji === entry.emoji ? " emolog-emoji-filter-active" : ""}`}
                        onClick={() => handleFilterEmoji(entry.emoji)}
                        title={
                          filterEmoji === entry.emoji ? "フィルター解除" : "この絵文字でフィルター"
                        }
                      >
                        {entry.emoji}
                      </span>
                      {editingId === entry.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          onBlur={handleSaveNote}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNote();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          className="emolog-edit-input"
                          maxLength={40}
                          placeholder="メモを入力"
                        />
                      ) : (
                        <span
                          className={`emolog-entry-note${entry.note ? "" : " emolog-entry-note-empty"}`}
                          onClick={() => handleStartEdit(entry)}
                        >
                          {entry.note || "＋"}
                        </span>
                      )}
                      <button
                        className="emolog-entry-delete"
                        onClick={() => entry.id && handleDelete(entry.id)}
                        title="削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
