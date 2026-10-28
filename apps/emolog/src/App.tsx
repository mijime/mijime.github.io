import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { ConfirmDialog, IconButton } from "@mijime/theme/ui";
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
  updateEntryLocation,
} from "./store";
import { captureLocation, isLocationEnabled, setLocationEnabled } from "./location";
import { today, type ExportData, type ListDef } from "./types";
import { TabBar, type Tab } from "./TabBar";
import { RecordView } from "./RecordView";
import { HistoryView } from "./HistoryView";
import { CalendarTab } from "./CalendarTab";
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
  const [historyVersion, setHistoryVersion] = useState(0);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [lists, setLists] = useState<ListDef[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => getTopFavorites());
  const [filterEmoji, setFilterEmoji] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [deleteListTargetId, setDeleteListTargetId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [locationEnabled, setLocationEnabledState] = useState(() => isLocationEnabled());
  const [snackMessage, setSnackMessage] = useState<string | null>(null);
  const [snackAction, setSnackAction] = useState<
    { label: string; onClick: () => void } | undefined
  >(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const addListInputRef = useRef<HTMLInputElement>(null);
  const activeListTabRef = useRef<HTMLButtonElement>(null);

  const refreshFavorites = useCallback(() => {
    setFavorites(getTopFavorites());
  }, []);

  const refreshLists = useCallback(() => {
    getLists().then(setLists);
  }, []);

  useEffect(() => {
    setListError(null);
    ensureDefaultList()
      .then((defaultId) => {
        setSelectedListId(defaultId);
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
      const target = e.target;
      if (!(target instanceof Node)) return;
      const onTrigger = target instanceof Element && target.closest(".emolog-list-menu-btn");
      if (menuRef.current && !menuRef.current.contains(target) && !onTrigger) {
        setMenuOpen(null);
      }
    };
    const closeMenu = () => setMenuOpen(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", closeMenu);
    document.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", closeMenu);
      document.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    activeListTabRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedListId, lists]);

  useEffect(() => {
    if (renamingId !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  useEffect(() => {
    if (addingList) addListInputRef.current?.focus();
  }, [addingList]);

  async function handleTap(emoji: string, note?: string) {
    const now = Date.now();
    const id = await addEntry({
      date: today(),
      timestamp: now,
      emoji,
      note: note || undefined,
      listId: selectedListId ?? undefined,
    });
    if (locationEnabled) {
      void captureLocation().then((location) => {
        if (location) {
          void updateEntryLocation(id, location).then(() => setHistoryVersion((v) => v + 1));
        }
      });
    }
    incrementFavorite(emoji);
    refreshFavorites();
    setHistoryVersion((v) => v + 1);
  }

  function handleSelectEmojiFromStats(emoji: string) {
    setFilterEmoji(emoji);
    setActiveTab("record");
  }

  function handleSnackBar(message: string, action?: { label: string; onClick: () => void }) {
    setSnackMessage(message);
    setSnackAction(action);
  }

  // ── List management ──
  function handleStartAddList() {
    setAddingList(true);
    setNewListName("");
    setMenuOpen(null);
  }

  function selectList(id: number) {
    setSelectedListId(id);
    setFilterTag(null);
    setFilterEmoji(null);
  }

  function toggleListMenu(id: number, target: HTMLElement) {
    if (menuOpen === id) {
      setMenuOpen(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const menuWidth = 160;
    setMenuPosition({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
    });
    setMenuOpen(id);
  }

  async function handleCommitAddList() {
    const trimmed = newListName.trim();
    setAddingList(false);
    setNewListName("");
    if (!trimmed) return;
    if (lists.some((l) => l.name === trimmed)) {
      alert("同じ名前のリストが既にあります");
      return;
    }
    const id = await addList(trimmed).catch(() => null);
    if (id === null) {
      alert("同じ名前のリストが既にあります");
      return;
    }
    await refreshLists();
    selectList(id);
  }

  function handleRemoveList(id: number) {
    if (lists.length <= 1) {
      alert("最後のリストは削除できません");
      return;
    }
    setDeleteListTargetId(id);
  }

  async function confirmRemoveList() {
    const id = deleteListTargetId;
    setDeleteListTargetId(null);
    if (id === null) return;
    const fallbackId = await removeList(id);
    await refreshLists();
    if (selectedListId === id) {
      selectList(fallbackId);
    }
    setMenuOpen(null);
  }

  function handleStartRename(id: number, name: string) {
    setRenamingId(id);
    setRenameValue(name);
    setMenuOpen(null);
  }

  async function handleCommitRename() {
    const oldId = renamingId;
    if (oldId === null) return;
    const current = lists.find((l) => l.id === oldId);
    const oldName = current?.name ?? "";
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      setRenamingId(null);
      return;
    }
    if (lists.some((l) => l.name === newName && l.id !== oldId)) {
      alert("同じ名前のリストが既にあります");
      return;
    }
    const updated = await renameList(oldId, newName).then(
      () => true,
      () => false,
    );
    if (!updated) {
      alert("同じ名前のリストが既にあります");
      return;
    }
    await refreshLists();
    setRenamingId(null);
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
    if (updatedLists.length > 0 && !updatedLists.some((l) => l.id === selectedListId)) {
      const firstId = updatedLists[0]?.id;
      if (firstId !== undefined) selectList(firstId);
    }
    refreshFavorites();
    setHistoryVersion((v) => v + 1);
  }

  async function handleDeleteAll() {
    await deleteAll();
    localStorage.removeItem(FAV_KEY);
    const defaultId = await ensureDefaultList();
    selectList(defaultId);
    await refreshLists();
    refreshFavorites();
    setActiveTab("record");
    setHistoryVersion((v) => v + 1);
  }

  const deleteListName = lists.find((list) => list.id === deleteListTargetId)?.name;
  const menuList = lists.find((list) => list.id === menuOpen);

  return (
    <div className="emolog">
      {/* ── リストタブバー ── */}
      <div className="emolog-lists">
        {listError ? (
          <div className="emolog-list-placeholder" style={{ color: "var(--danger)" }}>
            エラー: {listError}
          </div>
        ) : lists.length === 0 ? (
          <div className="emolog-list-placeholder">読み込み中…</div>
        ) : (
          <>
            <div className="emolog-list-tabs">
              {lists.map((l) => {
                const id = l.id ?? -1;
                return (
                  <div key={id} className="emolog-list-tab-wrap">
                    {renamingId === id ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        className="emolog-list-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleCommitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCommitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        maxLength={20}
                      />
                    ) : (
                      <button
                        ref={id === selectedListId ? activeListTabRef : undefined}
                        className={`emolog-list-tab${id === selectedListId ? " emolog-list-active" : ""}`}
                        onClick={() => selectList(id)}
                        onDoubleClick={() => handleStartRename(id, l.name)}
                      >
                        {l.name}
                      </button>
                    )}
                    {renamingId !== id && (
                      <div className="emolog-list-menu-wrap">
                        <button
                          className="emolog-list-menu-btn"
                          title="リストを編集"
                          aria-label="リストを編集"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleListMenu(id, e.currentTarget);
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {addingList && (
                <input
                  ref={addListInputRef}
                  type="text"
                  className="emolog-list-rename-input"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onBlur={handleCommitAddList}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitAddList();
                    if (e.key === "Escape") {
                      setAddingList(false);
                      setNewListName("");
                    }
                  }}
                  placeholder="新しいリスト"
                  maxLength={20}
                />
              )}
            </div>
            <div className="emolog-list-actions">
              {!addingList && (
                <IconButton
                  label="リストを追加"
                  size="icon-sm"
                  className="emolog-list-add"
                  onClick={handleStartAddList}
                >
                  <Plus size={16} />
                </IconButton>
              )}
              <IconButton
                label="設定"
                size="icon-sm"
                className="emolog-settings-trigger"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings size={16} />
              </IconButton>
            </div>
          </>
        )}
      </div>

      {menuList && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="emolog-list-menu"
              role="menu"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <button
                role="menuitem"
                onClick={() => handleStartRename(menuList.id ?? -1, menuList.name)}
              >
                <Pencil size={12} /> 名前を変更
              </button>
              <button
                role="menuitem"
                className="emolog-list-menu-del"
                onClick={() => {
                  setMenuOpen(null);
                  handleRemoveList(menuList.id ?? -1);
                }}
              >
                <Trash2 size={12} /> 削除
              </button>
            </div>,
            document.body,
          )
        : null}

      {/* ── メインコンテンツ ── */}
      <div className="emolog-content">
        {activeTab === "record" && (
          <>
            <RecordView favorites={favorites} onTap={handleTap} />
            <section className="emolog-history-section">
              <h2 className="emolog-history-section-title">履歴</h2>
              <HistoryView
                selectedListId={selectedListId}
                filterEmoji={filterEmoji}
                onFilterEmoji={setFilterEmoji}
                filterTag={filterTag}
                onFilterTag={setFilterTag}
                onSnackBar={handleSnackBar}
                refreshKey={historyVersion}
              />
            </section>
          </>
        )}
        {activeTab === "calendar" && (
          <CalendarTab
            listId={selectedListId}
            onSelectEmoji={handleSelectEmojiFromStats}
            onSnackBar={handleSnackBar}
          />
        )}
        {activeTab === "stats" && (
          <StatsView selectedListId={selectedListId} onSelectEmoji={handleSelectEmojiFromStats} />
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
        locationEnabled={locationEnabled}
        onLocationEnabledChange={(enabled) => {
          setLocationEnabledState(enabled);
          setLocationEnabled(enabled);
        }}
      />

      {/* ── リスト削除の確認 ── */}
      <ConfirmDialog
        open={deleteListTargetId !== null}
        title="リストを削除"
        description={deleteListName ? `「${deleteListName}」を削除します。` : undefined}
        tone="danger"
        confirmLabel="削除"
        onCancel={() => setDeleteListTargetId(null)}
        onConfirm={confirmRemoveList}
      >
        <p className="text-sm">このリストの記録は残りの先頭リストに移動します。</p>
      </ConfirmDialog>
    </div>
  );
}
