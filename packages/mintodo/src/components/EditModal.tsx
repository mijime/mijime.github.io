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
  const { modal } = state;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-full max-w-md rounded overflow-hidden"
        style={{ background: "var(--paper)", border: "1px solid var(--border)" }}
      >
        <div className="p-6">
          <h3
            className="text-lg mb-4 flex items-center gap-2"
            style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600, color: "var(--ink)" }}
          >
            <Pencil size={18} style={{ color: "var(--terra)" }} /> タスクを編集
          </h3>
          <div className="space-y-4">
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-1"
                style={{ color: "var(--mid)" }}
              >
                内容
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSave();
                }}
                className="w-full px-3 py-2 rounded text-sm outline-none"
                style={{
                  background: "var(--toolbar-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                }}
                placeholder="タスクを入力..."
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-xs uppercase tracking-wider mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  期限（期日）
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{
                    background: "var(--toolbar-bg)",
                    border: "1px solid var(--border)",
                    color: "var(--ink)",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-xs uppercase tracking-wider mb-1"
                  style={{ color: "var(--mid)" }}
                >
                  カテゴリーカラー
                </label>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      aria-label={c.label}
                      className={`w-7 h-7 rounded-full border-2 transition ${COLOR_BG[c.color]}`}
                      style={{
                        borderColor: categoryColor === c.color ? "var(--terra)" : "transparent",
                        outline: categoryColor === c.color ? "1px solid var(--terra)" : "none",
                        outlineOffset: 2,
                      }}
                      onClick={() => setCategoryColor(c.color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-1"
                style={{ color: "var(--mid)" }}
              >
                優先度
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className="py-2 rounded text-xs font-medium transition"
                    style={
                      priority === p.value
                        ? { background: "var(--terra)", color: "var(--paper)" }
                        : {
                            background: "var(--paper)",
                            border: "1px solid var(--border)",
                            color: "var(--ink)",
                          }
                    }
                    onClick={() => setPriority(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div
          className="flex justify-between items-center p-4"
          style={{ background: "var(--toolbar-bg)", borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            className="px-4 py-2 rounded text-sm font-semibold transition flex items-center gap-1.5"
            style={{ color: "var(--terra)" }}
            onClick={onDelete}
          >
            <Trash2 size={14} /> 削除
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded text-sm font-medium transition"
              style={{
                background: "var(--paper)",
                border: "1px solid var(--border)",
                color: "var(--ink)",
              }}
              onClick={close}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="px-5 py-2 rounded text-sm font-semibold transition"
              style={{ background: "var(--terra)", color: "var(--paper)" }}
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
