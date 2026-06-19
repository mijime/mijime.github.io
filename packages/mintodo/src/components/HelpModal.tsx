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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Keyboard className="text-indigo-600" size={18} /> 操作ヘルプ ＆ ショートカットキー
          </h3>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            プロ向けショートカット
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
            {SHORTCUTS.map((s) => (
              <div
                key={s.key}
                className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5"
              >
                <span>{s.desc}</span>
                <kbd className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono font-bold">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700/50">
          <button
            type="button"
            className="px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white text-sm font-semibold rounded-xl transition"
            onClick={close}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
