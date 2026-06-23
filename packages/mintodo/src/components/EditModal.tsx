import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { parseInlineDSL } from "../dsl";
import { useMindStore } from "../hooks/use-mind-store";
import type { CategoryColor, Priority } from "../types";

const COLORS: { value: CategoryColor; label: string; bg: string }[] = [
  { value: "slate", label: "slate", bg: "bg-slate-400" },
  { value: "sky", label: "sky", bg: "bg-sky-400" },
  { value: "emerald", label: "emerald", bg: "bg-emerald-400" },
  { value: "rose", label: "rose", bg: "bg-rose-400" },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

function swatchActive(c: CategoryColor, current: CategoryColor): string {
  return c === current ? "ring-2 ring-offset-1 ring-slate-700 dark:ring-slate-200" : "";
}

export function EditModal() {
  const { state, dispatch } = useMindStore();
  const { modal } = state;

  // All state hooks before any early return (React rules-of-hooks)
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [priority, setPriority] = useState<Priority>("medium");
  const [categoryColor, setCategoryColor] = useState<CategoryColor>("slate");
  const [dueDate, setDueDate] = useState("");
  const [completed, setCompleted] = useState(false);
  const [barTouched, setBarTouched] = useState(false);

  const isNew = modal?.kind === "edit-new";
  const node = isNew ? null : modal?.kind === "edit" ? state.nodes[modal.nodeId] : null;

  // Close modal if the target node disappears (e.g. deleted externally)
  useEffect(() => {
    if (modal?.kind === "edit" && !node) {
      dispatch({ modal: null, type: "OPEN_MODAL" });
    }
  }, [modal, node, dispatch]);

  // Sync local state when modal opens or switches target
  useEffect(() => {
    if (modal?.kind === "edit" && node) {
      setText(node.text);
      setPriority(node.priority);
      setCategoryColor(node.categoryColor);
      setDueDate(node.dueDate);
      setCompleted(node.completed);
      setExpanded(false);
      setBarTouched(false);
    } else if (modal?.kind === "edit-new") {
      setText("");
      setPriority("medium");
      setCategoryColor("slate");
      setDueDate("");
      setCompleted(false);
      setExpanded(false);
      setBarTouched(false);
    }
    // Key changes when modal target changes: nodeId for edit, parentId for edit-new
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal?.kind === "edit" ? modal.nodeId : modal?.kind === "edit-new" ? modal.parentId : null]);

  // Reset expanded/barTouched when modal reopens (transitions from null to non-null)
  const prevModalRef = useRef<typeof modal>(null);
  useEffect(() => {
    const wasClosed = prevModalRef.current === null;
    prevModalRef.current = modal;
    if (wasClosed && modal !== null) {
      setExpanded(false);
      setBarTouched(false);
    }
  }, [modal]);

  if (modal?.kind !== "edit" && modal?.kind !== "edit-new") return null;
  if (!isNew && !node) return null;

  const m = modal as { kind: "edit"; nodeId: string } | { kind: "edit-new"; parentId: string };

  function handleTextChange(value: string): void {
    setText(value);
    if (!barTouched) {
      const dsl = parseInlineDSL(value);
      if (dsl.priority !== null) setPriority(dsl.priority);
      if (dsl.categoryColor !== null) setCategoryColor(dsl.categoryColor);
      if (dsl.dueDate !== null) setDueDate(dsl.dueDate);
      if (dsl.completed !== null) setCompleted(dsl.completed);
    }
  }

  function handlePriorityClick(p: Priority): void {
    setPriority(p);
    setBarTouched(true);
  }

  function handleColorClick(c: CategoryColor): void {
    setCategoryColor(c);
    setBarTouched(true);
  }

  function handleDueDateChange(d: string): void {
    setDueDate(d);
    setBarTouched(true);
  }

  function commit(): void {
    const dsl = parseInlineDSL(text);
    if (isNew) {
      if (dsl.text === "" && !dsl.hasAnyAttribute) {
        close();
        return;
      }
      const newId = `node-${Date.now()}`;
      dispatch({
        type: "CREATE_CHILD",
        newId,
        parentId: (m as { kind: "edit-new"; parentId: string }).parentId,
        text: dsl.text,
        priority,
        categoryColor,
        dueDate,
        completed,
      });
    } else {
      if (dsl.text === "" && !dsl.hasAnyAttribute) {
        dispatch({ id: (m as { kind: "edit"; nodeId: string }).nodeId, type: "DELETE_NODE" });
        dispatch({ modal: null, type: "OPEN_MODAL" });
        return;
      }
      dispatch({
        type: "UPDATE_NODE",
        id: (m as { kind: "edit"; nodeId: string }).nodeId,
        patch: { text: dsl.text, priority, categoryColor, dueDate, completed },
      });
    }
    dispatch({ modal: null, type: "OPEN_MODAL" });
  }

  function handleDelete(): void {
    if (isNew) return;
    if (!window.confirm("このタスクと、紐づくすべての子タスクを削除しますか？")) return;
    dispatch({ id: (m as { kind: "edit"; nodeId: string }).nodeId, type: "DELETE_NODE" });
    dispatch({ modal: null, type: "OPEN_MODAL" });
  }

  function close(): void {
    dispatch({ modal: null, type: "OPEN_MODAL" });
  }

  return (
    <div
      data-testid="edit-modal"
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
            <Pencil size={18} style={{ color: "var(--terra)" }} />
            {isNew ? "新規タスク" : "タスクを編集"}
          </h3>
          <div className="space-y-4">
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-1"
                style={{ color: "var(--mid)" }}
              >
               内容 (DSL可: @priority:high @color:sky @due:2026-12-31 @done)
              </label>
              <textarea
                data-testid="edit-modal-textarea"
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded text-sm outline-none resize-y min-h-[60px] font-mono"
                style={{
                  background: "var(--toolbar-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                }}

                placeholder="タスクを入力..."
                autoFocus
              />
            </div>
            <button
              type="button"
              data-testid="edit-modal-attr-toggle"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs flex items-center gap-1 hover:underline"
              style={{ color: "var(--mid)" }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              属性
            </button>
            {expanded && (
              <div className="space-y-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <div>
                  <label
                    className="block text-xs uppercase tracking-wider mb-1"
                    style={{ color: "var(--mid)" }}
                  >
                    カテゴリーカラー
                  </label>
                  <div className="flex items-center gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handleColorClick(c.value)}
                        className={`w-7 h-7 rounded-full ${c.bg} ${swatchActive(c.value, categoryColor)}`}
                        aria-label={c.label}
                      />
                    ))}
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
                        data-priority={p.value}
                        aria-pressed={priority === p.value}
                        onClick={() => handlePriorityClick(p.value)}
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
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    className="block text-xs uppercase tracking-wider mb-1"
                    style={{ color: "var(--mid)" }}
                  >
                    期限
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded text-sm outline-none"
                    style={{
                      background: "var(--toolbar-bg)",
                      border: "1px solid var(--border)",
                      color: "var(--ink)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div
          className="flex justify-between items-center p-4"
          style={{ background: "var(--toolbar-bg)", borderTop: "1px solid var(--border)" }}
        >
          {isNew ? (
            <div />
          ) : (
            <button
              type="button"
              data-testid="edit-modal-delete"
              className="px-4 py-2 rounded text-sm font-semibold transition flex items-center gap-1.5"
              style={{ color: "var(--terra)" }}
              onClick={handleDelete}
            >
              <Trash2 size={14} /> 削除
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="edit-modal-cancel"
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
              data-testid="edit-modal-save"
              className="px-5 py-2 rounded text-sm font-semibold transition"
              style={{ background: "var(--terra)", color: "var(--paper)" }}
              onClick={commit}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
