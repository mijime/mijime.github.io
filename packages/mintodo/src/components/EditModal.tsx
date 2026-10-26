import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Input, Modal, SectionLabel, Textarea } from "@mijime/theme/ui";
import { parseInlineDSL } from "../dsl";
import { useMindStore } from "../hooks/use-mind-store";
import { buildBreadcrumb, parentBreadcrumb } from "../lib/breadcrumb";
import type { CategoryColor, Priority, TaskStatus } from "../types";

const COLORS: { value: CategoryColor; label: string; bg: string }[] = [
  { value: "slate", label: "slate", bg: "bg-(--mid)" },
  { value: "sky", label: "sky", bg: "bg-(--tone-sky)" },
  { value: "emerald", label: "emerald", bg: "bg-(--tone-green)" },
  { value: "rose", label: "rose", bg: "bg-(--tone-rose)" },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "inbox", label: "受信箱" },
  { value: "wip", label: "作業中" },
  { value: "review", label: "レビュー" },
  { value: "done", label: "完了" },
];

function swatchActive(c: CategoryColor, current: CategoryColor): string {
  return c === current ? "ring-2 ring-offset-1 ring-(--accent) ring-offset-(--paper)" : "";
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
  const [status, setStatus] = useState<TaskStatus>("inbox");
  const [barTouched, setBarTouched] = useState(false);
  const [localEstimate, setLocalEstimate] = useState<number | null>(null);

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
      setStatus(node.status);
      setLocalEstimate(node.estimate);
      setExpanded(false);
      setBarTouched(false);
    } else if (modal?.kind === "edit-new") {
      setText("");
      setPriority("medium");
      setCategoryColor("slate");
      setDueDate("");
      setStatus(modal.parentStatusSeed ?? "inbox");
      setLocalEstimate(null);
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
  const breadcrumb =
    m.kind === "edit-new"
      ? `${buildBreadcrumb(state.nodes, m.parentId)} + 新規`
      : parentBreadcrumb(state.nodes, m.nodeId);

  function handleTextChange(value: string): void {
    setText(value);
    if (!barTouched) {
      const dsl = parseInlineDSL(value);
      if (dsl.priority !== null) setPriority(dsl.priority);
      if (dsl.categoryColor !== null) setCategoryColor(dsl.categoryColor);
      if (dsl.dueDate !== null) setDueDate(dsl.dueDate);
      if (dsl.status !== null) setStatus(dsl.status);
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

  function handleStatusClick(s: TaskStatus): void {
    setStatus(s);
    setBarTouched(true);
  }

  function handleDueDateChange(d: string): void {
    setDueDate(d);
    setBarTouched(true);
  }

  function commit(): void {
    const dsl = parseInlineDSL(text);
    const completedFlag = status === "done";
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
        completed: completedFlag,
        status,
        estimate: localEstimate,
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
        patch: {
          text: dsl.text,
          priority,
          categoryColor,
          dueDate,
          completed: completedFlag,
          status,
          estimate: localEstimate,
        },
      });
    }
    dispatch({ modal: null, type: "OPEN_MODAL" });
  }

  function handleDelete(): void {
    if (isNew) return;
    dispatch({ id: (m as { kind: "edit"; nodeId: string }).nodeId, type: "DELETE_NODE" });
    dispatch({ modal: null, type: "OPEN_MODAL" });
  }

  function close(): void {
    dispatch({ modal: null, type: "OPEN_MODAL" });
  }

  return (
    <Modal
      open
      onClose={close}
      testId="edit-modal"
      size="md"
      title={
        <span
          data-testid="edit-modal-title"
          className="flex items-center gap-2 truncate"
          title={breadcrumb}
        >
          <Pencil size={18} className="shrink-0 text-(--accent)" />
          <span className="truncate">{breadcrumb}</span>
        </span>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {isNew ? (
            <div />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              data-testid="edit-modal-delete"
              className="gap-1.5 text-(--accent)"
              onClick={handleDelete}
            >
              <Trash2 size={14} /> 削除
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" data-testid="edit-modal-cancel" onClick={close}>
              キャンセル
            </Button>
            <Button variant="primary" size="sm" data-testid="edit-modal-save" onClick={commit}>
              保存
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Field
          label="内容 (DSL可: @priority:high @color:sky @due:2026-12-31 @done)"
          htmlFor="edit-modal-textarea"
        >
          <Textarea
            id="edit-modal-textarea"
            data-testid="edit-modal-textarea"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commit();
              }
            }}
            rows={3}
            className="min-h-[60px] resize-y font-mono"
            placeholder="タスクを入力..."
            autoFocus
          />
        </Field>
        <button
          type="button"
          data-testid="edit-modal-attr-toggle"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-(--mid) hover:underline"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          属性
        </button>
        {expanded && (
          <div className="space-y-4 border-t border-(--border) pt-4">
            <div>
              <SectionLabel className="mb-1 block">カテゴリーカラー</SectionLabel>
              <div className="flex items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleColorClick(c.value)}
                    className={`h-7 w-7 rounded-full ${c.bg} ${swatchActive(c.value, categoryColor)}`}
                    aria-label={c.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <SectionLabel className="mb-1 block">優先度</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    data-priority={p.value}
                    aria-pressed={priority === p.value}
                    onClick={() => handlePriorityClick(p.value)}
                    className={`rounded-sm border px-1 py-2 text-xs font-medium transition ${
                      priority === p.value
                        ? "border-(--accent) bg-(--accent) text-(--on-accent)"
                        : "border-(--border) bg-(--paper) text-(--ink)"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel className="mb-1 block">ステータス</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    data-status={s.value}
                    data-testid={`status-${s.value}`}
                    aria-pressed={status === s.value}
                    onClick={() => handleStatusClick(s.value)}
                    className={`rounded-sm border px-1 py-2 text-xs font-medium transition ${
                      status === s.value
                        ? "border-(--accent) bg-(--accent) text-(--on-accent)"
                        : "border-(--border) bg-(--paper) text-(--ink)"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="期限" htmlFor="edit-modal-due">
              <Input
                id="edit-modal-due"
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
              />
            </Field>
            <Field label="見積もり (時間)" htmlFor="edit-modal-estimate">
              <Input
                id="edit-modal-estimate"
                type="number"
                data-testid="edit-modal-estimate"
                min={0}
                step={0.5}
                value={localEstimate === null ? "" : localEstimate}
                onChange={(e) =>
                  setLocalEstimate(
                    e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                  )
                }
              />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
