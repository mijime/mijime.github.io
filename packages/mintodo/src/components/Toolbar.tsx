import {
  CheckCircle2,
  Eye,
  Keyboard,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Trash2,
} from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { db } from "../db";
import { ViewModeToggle } from "./ViewModeToggle";

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
  const onDeleteCompleted = () => {
    if (!state.currentBoardId) return;
    if (!window.confirm("完了済みのタスクをすべて削除しますか？")) return;
    dispatch({ type: "DELETE_COMPLETED" });
  };

  return (
    <header
      className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 border-b"
      style={{ background: "var(--toolbar-bg)", borderColor: "var(--border)" }}
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
              mintodo
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
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded outline-none"
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
        <button
          type="button"
          data-testid="toolbar-delete-completed"
          className="p-2 rounded text-xs font-semibold transition flex items-center gap-1.5"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
          title="完了済みタスクをすべて削除"
          onClick={onDeleteCompleted}
        >
          <CheckCircle2 size={16} /> <span className="hidden sm:inline">完了を削除</span>
        </button>
      </div>
      <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-1">
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
        </div>
      </div>
    </header>
  );
}
