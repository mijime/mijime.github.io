import { useState, useEffect, useRef, useCallback } from "react";
import {
  addEntry,
  getLists,
  addList,
  renameList,
  removeList,
  ensureDefaultList,
  exportAll,
  importAll,
  deleteAll,
} from "./store";
import { today, type ExportData } from "./types";
import type { ListDef } from "./store";
import { TabBar, type Tab } from "./TabBar";
import { RecordView } from "./RecordView";
import { HistoryView } from "./HistoryView";
import { StatsView } from "./StatsView";
import { SnackBar } from "./SnackBar";
import { SettingsDialog } from "./SettingsDialog";

const FAV_KEY = "emolog-favs";
const MAX_FAV = 12;

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
    .toSorted(([, a], [, b]) => b - a)
    .slice(0, MAX_FAV)
    .map(([emoji]) => emoji);
}

function incrementFavorite(emoji: string) {
  const map = getFavMap();
  map[emoji] = (map[emoji] || 0) + 1;
  localStorage.setItem(FAV_KEY, JSON.stringify(map));
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("record");
  const [selectedList, setSelectedList] = useState<string>("");
  const [lists, setLists] = useState<ListDef[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => getTopFavorites());
  const [filterEmoji, setFilterEmoji] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [snackMessage, setSnackMessage] = useState<string | null>(null);
  const [snackAction, setSnackAction] = useState<
    { label: string; onClick: () => void } | undefined
  >(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const refreshFavorites = useCallback(() => {
    setFavorites(getTopFavorites());
  }, []);

  const refreshLists = useCallback(() => {
    getLists().then(setLists);
  }, []);

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

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  async function handleTap(emoji: string, note?: string) {
    const now = Date.now();
    await addEntry({
      date: today(),
      timestamp: now,
      emoji,
      note: note || undefined,
      list: selectedList || undefined,
    });
    incrementFavorite(emoji);
    refreshFavorites();
  }

  function handleSelectEmojiFromStats(emoji: string) {
    setFilterEmoji(emoji);
    setActiveTab("history");
  }

  function handleSelectDateFromStats(date: string) {
    setTargetDate(date);
    setActiveTab("history");
  }

  function handleSnackBar(message: string, action?: { label: string; onClick: () => void }) {
    setSnackMessage(message);
    setSnackAction(action);
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

  // ── Settings handlers ──
  async function handleExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emolog-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(data: ExportData) {
    await importAll(data);
    await refreshLists();
    const updatedLists = await getLists();
    if (updatedLists.length > 0 && !updatedLists.some((l) => l.name === selectedList)) {
      setSelectedList(updatedLists[0].name);
    }
    refreshFavorites();
  }

  async function handleDeleteAll() {
    await deleteAll();
    await ensureDefaultList().then(setSelectedList);
    await refreshLists();
    refreshFavorites();
    setActiveTab("record");
  }

  return (
    <div className="emolog">
      {/* ── 設定ボタン ── */}
      <div className="emolog-header">
        <span className="emolog-header-title">emolog</span>
        <button
          className="emolog-settings-trigger"
          onClick={() => setSettingsOpen(true)}
          title="設定"
        >
          ⚙️
        </button>
      </div>

      {/* ── リストタブバー ── */}
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
                      {l.name}
                    </button>
                  )}
                  {renaming !== l.name && (
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
                        ⋯
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

      {/* ── メインコンテンツ ── */}
      <div className="emolog-content">
        {activeTab === "record" && (
          <RecordView favorites={favorites} onTap={handleTap} selectedList={selectedList} />
        )}
        {activeTab === "history" && (
          <HistoryView
            selectedList={selectedList}
            filterEmoji={filterEmoji}
            onFilterEmoji={setFilterEmoji}
            targetDate={targetDate}
            onClearTargetDate={() => setTargetDate(null)}
            onSnackBar={handleSnackBar}
          />
        )}
        {activeTab === "stats" && (
          <StatsView
            selectedList={selectedList}
            onSelectEmoji={handleSelectEmojiFromStats}
            onSelectDate={handleSelectDateFromStats}
          />
        )}
      </div>

      {/* ── 下部タブバー ── */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── スナックバー ── */}
      <SnackBar
        message={snackMessage}
        action={snackAction}
        onDismiss={() => {
          setSnackMessage(null);
          setSnackAction(undefined);
        }}
      />

      {/* ── 設定ダイアログ ── */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onExport={handleExport}
        onImport={handleImport}
        onDeleteAll={handleDeleteAll}
      />
    </div>
  );
}
