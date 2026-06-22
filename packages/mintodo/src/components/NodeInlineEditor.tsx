import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { parseInlineDSL } from "../dsl";
import type { CategoryColor, MindNode, Priority } from "../types";

interface Props {
  node: MindNode;
  onCancel: () => void;
  onSave: (patch: {
    text: string;
    priority: Priority;
    categoryColor: CategoryColor;
    dueDate: string;
    completed: boolean;
  }) => void;
  onDelete: () => void;
}

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

export function NodeInlineEditor({ node, onCancel, onSave, onDelete }: Props) {
  const initial = parseInlineDSL(node.text);
  const [text, setText] = useState<string>(node.text);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [priority, setPriority] = useState<Priority>(initial.priority ?? node.priority);
  const [color, setColor] = useState<CategoryColor>(initial.categoryColor ?? node.categoryColor);
  const [dueDate, setDueDate] = useState<string>(initial.dueDate ?? node.dueDate);
  const [barTouched, setBarTouched] = useState<boolean>(false);

  function handleTextChange(value: string): void {
    setText(value);
    if (!barTouched) {
      const dsl = parseInlineDSL(value);
      setPriority(dsl.priority ?? node.priority);
      setColor(dsl.categoryColor ?? node.categoryColor);
      setDueDate(dsl.dueDate ?? node.dueDate);
    }
  }

  function handlePriorityClick(p: Priority): void {
    setPriority(p);
    setBarTouched(true);
  }

  function handleColorClick(c: CategoryColor): void {
    setColor(c);
    setBarTouched(true);
  }

  function handleDueDateChange(d: string): void {
    setDueDate(d);
    setBarTouched(true);
  }

  function commit(): void {
    const dsl = parseInlineDSL(text);
    if (dsl.text === "" && !dsl.hasAnyAttribute) {
      onDelete();
      return;
    }
    onSave({
      text: dsl.text,
      priority,
      categoryColor: color,
      dueDate,
      completed: dsl.completed ?? node.completed,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  }

  return (
    <div
      data-inline-editor
      className="bg-white dark:bg-slate-800 border-2 border-sky-400 rounded-lg p-3 shadow-lg flex flex-col gap-2 min-w-[260px] max-w-[480px]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        className="w-full text-sm font-mono border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-y min-h-[60px]"
      />
      <button
        type="button"
        data-attr-toggle
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 self-start hover:underline"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        属性
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-12">色</span>
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => handleColorClick(c.value)}
                className={`w-6 h-6 rounded-full ${c.bg} ${swatchActive(c.value, color)}`}
                aria-label={c.label}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-12">優先度</span>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                data-priority={p.value}
                aria-pressed={priority === p.value}
                onClick={() => handlePriorityClick(p.value)}
                className={`px-2 py-1 text-xs rounded border ${priority === p.value ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900" : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-12">期限</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={commit}
          className="px-3 py-1 text-xs rounded bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
        >
          保存
        </button>
      </div>
    </div>
  );
}
