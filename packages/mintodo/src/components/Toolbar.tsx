import {
  Eye,
  FileText,
  Keyboard,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { db } from "../db";
import { ViewModeToggle } from "./ViewModeToggle";

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
            title={state.drawerOpen ? "サイドバーを隠す" : "サイドバーを表示"}
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
          >
            {state.drawerOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
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
        <ViewModeToggle />
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 rounded transition"
            style={{ color: "var(--mid)" }}
            title="DSL編集"
            onClick={() => dispatch({ modal: { kind: "dsl-editor" }, type: "OPEN_MODAL" })}
          >
            <FileText size={16} />
          </button>
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
