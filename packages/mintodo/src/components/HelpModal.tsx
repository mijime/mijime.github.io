import { Keyboard } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";

const SHORTCUTS: { desc: string; key: string }[] = [
  { desc: "子ノードを追加", key: "Tab" },
  { desc: "同じ階層（兄弟）を追加", key: "Enter" },
  { desc: "ノードを編集", key: "E" },
  { desc: "タスクを削除", key: "Delete" },
  { desc: "完了状態の切り替え", key: "Space" },
  { desc: "選択の移動", key: "↑ ↓ ← →" },
];

export function HelpModal() {
  const { state, dispatch } = useMindStore();
  if (state.modal?.kind !== "help") return null;
  const close = () => dispatch({ modal: null, type: "OPEN_MODAL" });
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-full max-w-lg rounded overflow-hidden"
        style={{ background: "var(--paper)", border: "1px solid var(--border)" }}
      >
        <div className="p-6">
          <h3
            className="text-lg mb-4 flex items-center gap-2"
            style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600, color: "var(--ink)" }}
          >
            <Keyboard size={18} style={{ color: "var(--terra)" }} /> 操作ヘルプ ＆
            ショートカットキー
          </h3>
          <h4 className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--mid)" }}>
            プロ向けショートカット
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm" style={{ color: "var(--ink)" }}>
            {SHORTCUTS.map((s) => (
              <div
                key={s.key}
                className="flex justify-between pb-1.5"
                style={{ borderBottom: "1px solid var(--grid)" }}
              >
                <span>{s.desc}</span>
                <kbd
                  className="px-1.5 py-0.5 rounded text-xs font-mono font-bold"
                  style={{ background: "var(--toolbar-bg)", border: "1px solid var(--border)" }}
                >
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
        <div
          className="flex justify-end p-4"
          style={{ background: "var(--toolbar-bg)", borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            className="px-5 py-2 text-sm font-semibold rounded transition"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
            onClick={close}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
