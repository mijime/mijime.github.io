import {
  Download,
  Eye,
  FileText,
  FileUp,
  Keyboard,
  Menu,
  Moon,
  Network,
  Search,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import { downloadJson, downloadText, parseImportedJson } from "../storage";
import { db } from "../db";
import { parseDSL, serializeDSL } from "../dsl";
import type { MindNode } from "../types";

function onTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

async function onReset() {
  if (
    !confirm(
      "すべてのデータを初期化しますか？（IndexedDBの全データが削除され、ページがリロードされます）",
    )
  )
    return;
  await db.delete();
  location.reload();
}

export function Toolbar() {
  const { state, dispatch } = useMindStore();
  const actions = useBoardActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const dslFileRef = useRef<HTMLInputElement>(null);

  const onExportDsl = () => {
    const currentBoard = state.boards.find((b) => b.id === state.currentBoardId);
    const text = serializeDSL({ name: currentBoard?.name ?? "Unknown" }, state.nodes);
    const date = new Date().toISOString().slice(0, 10);
    const url = downloadText(
      text,
      `mintodo_${currentBoard?.name ?? "Unknown"}_${date}.md`,
      "text/markdown",
    );
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImportDslClick = () => dslFileRef.current?.click();

  const onDslFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseDSL(text, state.currentBoardId ?? "");
    if (!parsed) {
      alert("DSLの読み込みに失敗しました。ファイルが壊れている可能性があります。");
      e.target.value = "";
      return;
    }
    if (
      Object.keys(state.nodes).length > 0 &&
      !confirm(
        `「${parsed.board.name}」から${parsed.nodes.length}件のタスクをインポートします。\n現在のボード「${state.boards.find((b) => b.id === state.currentBoardId)?.name ?? ""}」のタスクと名前は置き換えられます。続行しますか?`,
      )
    ) {
      e.target.value = "";
      return;
    }
    if (state.currentBoardId) {
      try {
        await actions.renameBoard(state.currentBoardId, parsed.board.name);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
    const rec: Record<string, MindNode> = {};
    for (const n of parsed.nodes) rec[n.id] = n;
    dispatch({ nodes: rec, type: "SET_NODES" });
    e.target.value = "";
  };

  const onExport = () => {
    const currentBoard = state.boards.find((b) => b.id === state.currentBoardId);
    const data = {
      version: 2 as const,
      board: { id: currentBoard?.id ?? "", name: currentBoard?.name ?? "Unknown" },
      nodes: Object.values(state.nodes),
    };
    const date = new Date().toISOString().slice(0, 10);
    const url = downloadJson(data, `mintodo_${currentBoard?.name ?? "Unknown"}_${date}.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImportClick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = parseImportedJson(text);
    if (!data) {
      alert("インポートに失敗しました。ファイルが壊れている可能性があります。");
      return;
    }
    if (
      Object.keys(state.nodes).length > 0 &&
      !confirm(
        `「${data.board.name}」から${data.nodes.length}件のタスクをインポートします。\nこのボードの現在のタスクは失われます。続行しますか?`,
      )
    ) {
      e.target.value = "";
      return;
    }
    // Rewrite boardId so nodes belong to the current board.
    const currentId = state.currentBoardId;
    const rec: Record<string, (typeof data.nodes)[number]> = {};
    for (const n of data.nodes) {
      rec[n.id] = { ...n, boardId: currentId ?? n.boardId };
    }
    dispatch({ nodes: rec, type: "SET_NODES" });
    e.target.value = "";
  };

  const onToggleDrawer = () => dispatch({ type: "TOGGLE_DRAWER" });

  return (
    <header
      className="absolute top-4 left-4 right-4 z-10 flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 rounded transition-all"
      style={{ background: "var(--toolbar-bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between lg:justify-start gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleDrawer}
            title="ボード一覧"
            className="p-2 rounded transition md:hidden"
            style={{ color: "var(--mid)" }}
          >
            <Menu size={18} />
          </button>
          <div
            className="p-2 rounded"
            style={{ background: "var(--terra)", color: "var(--paper)" }}
          >
            <Network size={18} />
          </div>
          <div>
            <h1
              className="text-lg leading-tight tracking-wide"
              style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600 }}
            >
              MindTodo Pro
            </h1>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
        <div className="relative flex-1 min-w-[150px] lg:max-w-[240px]">
          <span
            className="absolute inset-y-0 left-3 flex items-center"
            style={{ color: "var(--mid)" }}
          >
            <Search size={12} />
          </span>
          <input
            type="text"
            value={state.searchQuery}
            onChange={(e) => dispatch({ query: e.target.value, type: "SET_SEARCH" })}
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded outline-none transition"
            style={{
              background: "var(--paper)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
            }}
            placeholder="タスクを検索..."
          />
        </div>
        <button
          type="button"
          className="p-2 rounded text-xs font-semibold transition flex items-center gap-1.5"
          style={
            state.hideCompleted
              ? { background: "var(--terra)", color: "var(--paper)" }
              : {
                  background: "var(--paper)",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                }
          }
          title="未完了のみ表示トグル"
          onClick={() => dispatch({ type: "TOGGLE_HIDE_COMPLETED" })}
        >
          <Eye size={16} /> <span className="hidden sm:inline">未完了のみ</span>
        </button>
      </div>
      <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded"
          style={{ background: "var(--paper)", border: "1px solid var(--border)" }}
        >
          <span className="hidden sm:inline text-xs font-semibold" style={{ color: "var(--ink)" }}>
            自動配置
          </span>
          <button
            type="button"
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
            style={{ background: state.physicsEnabled ? "var(--terra)" : "var(--grid)" }}
            onClick={() => dispatch({ type: "TOGGLE_PHYSICS" })}
          >
            <span
              className="inline-block h-3.5 w-3.5 transform rounded-full transition-transform"
              style={{
                background: "var(--paper)",
                transform: state.physicsEnabled ? "translateX(18px)" : "translateX(3px)",
              }}
            />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="JSONエクスポート"
            onClick={onExport}
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="JSONインポート"
            onClick={onImportClick}
          >
            <Upload size={16} />
          </button>
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="DSLエクスポート"
            onClick={onExportDsl}
          >
            <FileText size={16} />
          </button>
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="DSLインポート"
            onClick={onImportDslClick}
          >
            <FileUp size={16} />
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onFile} />
          <input
            ref={dslFileRef}
            type="file"
            accept=".md"
            className="hidden"
            onChange={onDslFile}
          />
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="ヘルプ・ショートカット"
            onClick={() => dispatch({ modal: { kind: "help" }, type: "OPEN_MODAL" })}
          >
            <Keyboard size={18} />
          </button>
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--terra)" }}
            title="すべてリセット"
            onClick={onReset}
          >
            <Trash2 size={18} />
          </button>
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="テーマ切り替え"
            onClick={onTheme}
          >
            <Moon size={18} className="dark:hidden" />
            <Sun size={18} className="hidden dark:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
