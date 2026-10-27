import { useState } from "react";
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
import { Button, ConfirmDialog, IconButton, Input } from "@mijime/theme/ui";
import { useMindStore } from "../hooks/use-mind-store";
import { db } from "../db";
import { ViewModeToggle } from "./ViewModeToggle";

type ConfirmKind = "delete-completed" | "reset";

export function Toolbar() {
  const { state, dispatch } = useMindStore();
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);

  const onToggleDrawer = () => dispatch({ type: "TOGGLE_DRAWER" });

  const handleConfirm = async () => {
    const kind = confirm;
    setConfirm(null);
    if (kind === "delete-completed") {
      dispatch({ type: "DELETE_COMPLETED" });
      return;
    }
    if (kind === "reset") {
      await db.delete();
      location.reload();
    }
  };

  return (
    <>
      <header
        className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 border-b"
        style={{ background: "var(--toolbar-bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between lg:justify-start gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <IconButton
              label={state.drawerOpen ? "サイドバーを隠す" : "サイドバーを表示"}
              size="icon-sm"
              onClick={onToggleDrawer}
            >
              {state.drawerOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </IconButton>
            <div
              className="p-2 rounded"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}
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
              style={{ color: "var(--muted)" }}
            >
              <Search size={12} />
            </span>
            <Input
              type="text"
              value={state.searchQuery}
              onChange={(e) => dispatch({ query: e.target.value, type: "SET_SEARCH" })}
              className="w-full pl-9 pr-4 py-1.5 text-sm"
              placeholder="タスクを検索..."
            />
          </div>
          <ViewModeToggle />
          <Button
            variant={state.hideCompleted ? "primary" : "secondary"}
            size="sm"
            title="未完了のみ表示トグル"
            onClick={() => dispatch({ type: "TOGGLE_HIDE_COMPLETED" })}
          >
            <Eye size={16} /> <span className="hidden sm:inline">未完了のみ</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            data-testid="toolbar-delete-completed"
            title="完了済みタスクをすべて削除"
            onClick={() => setConfirm("delete-completed")}
          >
            <CheckCircle2 size={16} /> <span className="hidden sm:inline">完了を削除</span>
          </Button>
        </div>
        <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1">
            <IconButton
              label="ヘルプ・ショートカット"
              size="icon-sm"
              onClick={() => dispatch({ modal: { kind: "help" }, type: "OPEN_MODAL" })}
            >
              <Keyboard size={18} />
            </IconButton>
            <IconButton
              label="すべてリセット"
              size="icon-sm"
              style={{ color: "var(--danger)" }}
              onClick={() => setConfirm("reset")}
            >
              <Trash2 size={18} />
            </IconButton>
          </div>
        </div>
      </header>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "reset" ? "すべてのデータを初期化" : "完了済みタスクを削除"}
        description={
          confirm === "reset"
            ? "IndexedDBの全データが削除され、ページがリロードされます。"
            : "完了済みのタスクをすべて削除します。"
        }
        tone={confirm === "reset" ? "danger" : "primary"}
        confirmLabel={confirm === "reset" ? "初期化" : "削除"}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
