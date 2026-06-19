import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import type { CategoryColor, Priority } from "../types";

const CATEGORIES: { color: CategoryColor; label: string }[] = [
  { color: "slate", label: "Slate" },
  { color: "sky", label: "Sky" },
  { color: "emerald", label: "Emerald" },
  { color: "rose", label: "Rose" },
];

const COLOR_BG: Record<CategoryColor, string> = {
  slate: "bg-slate-400",
  sky: "bg-sky-400",
  emerald: "bg-emerald-400",
  rose: "bg-rose-400",
};

const PRIORITIES: { label: string; value: Priority }[] = [
  { label: "低", value: "low" },
  { label: "中", value: "medium" },
  { label: "高", value: "high" },
];

export function EditModal() {
  const { state, dispatch } = useMindStore();
  const {modal} = state;
  const isEdit = modal?.kind === "edit";
  const node = isEdit ? state.nodes[modal.nodeId] : null;

  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [categoryColor, setCategoryColor] = useState<CategoryColor>("slate");

  useEffect(() => {
    if (isEdit && node) {
      setText(node.text);
      setDueDate(node.dueDate);
      setPriority(node.priority);
      setCategoryColor(node.categoryColor);
    }
  }, [isEdit, node]);

  if (!isEdit || !node) return null;

  const close = () => dispatch({ modal: null, type: "OPEN_MODAL" });

  const onSave = () => {
    const t = text.trim();
    if (!t) return;
    dispatch({
      id: node.id,
      patch: { categoryColor, dueDate, priority, text: t },
      type: "UPDATE_NODE",
    });
    close();
  };

  const onDelete = () => {
    if (!confirm("このタスクと、紐づくすべての子タスクを削除しますか？")) return;
    dispatch({ id: node.id, type: "DELETE_NODE" });
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Pencil className="text-indigo-600" size={18} /> タスクを編集
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">内容</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSave();
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="タスクを入力..."
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">期限（期日）</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">カテゴリーカラー</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      aria-label={c.label}
                      className={`w-7 h-7 rounded-full border-2 transition ${COLOR_BG[c.color]} ${categoryColor === c.color ? "ring-4 ring-indigo-500 border-transparent" : "border-transparent"}`}
                      onClick={() => setCategoryColor(c.color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">優先度</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`py-2 rounded-xl text-xs font-medium border transition ${
                      priority === p.value
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                    onClick={() => setPriority(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700/50">
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm font-semibold transition flex items-center gap-1.5"
            onClick={onDelete}
          >
            <Trash2 size={14} /> 削除
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium transition"
              onClick={close}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition"
              onClick={onSave}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
