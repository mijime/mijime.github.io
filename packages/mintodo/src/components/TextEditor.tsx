import { useEffect, useMemo, useState } from "react";
import { parseDSL, serializeDSL } from "../dsl";
import { useMindStore } from "../hooks/use-mind-store";
import type { MindNode } from "../types";

interface PreviewProps {
  nodes: MindNode[];
  error: string | null;
}

function Preview({ nodes, error }: PreviewProps) {
  if (error) {
    return (
      <div
        data-testid="text-editor-error"
        className="text-sm text-rose-500 dark:text-rose-400"
      >
        {error}
      </div>
    );
  }
  if (nodes.length === 0) {
    return <div className="text-sm" style={{ color: "var(--mid)" }}>(ノードなし)</div>;
  }
  return (
    <ul data-testid="text-editor-preview" className="text-sm flex flex-col gap-1">
      {nodes.map((n) => (
        <li key={n.id} style={{ paddingLeft: `${0}px` }}>
          <span style={{ color: "var(--ink)" }}>{n.text}</span>
          <span className="ml-2 text-[10px]" style={{ color: "var(--mid)" }}>
            {[
              n.priority !== "medium" && `priority:${n.priority}`,
              n.categoryColor !== "slate" && `color:${n.categoryColor}`,
              n.dueDate && `due:${n.dueDate}`,
              n.status !== "inbox" && `status:${n.status}`,
              n.completed && "done",
            ]
              .filter(Boolean)
              .join(" ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TextEditor() {
  const { state, dispatch } = useMindStore();
  const board = state.boards.find((b) => b.id === state.currentBoardId);

  const initial = useMemo(
    () => serializeDSL({ name: board?.name ?? "" }, state.nodes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [text, setText] = useState(initial);

  useEffect(() => {
    setText(initial);
  }, [initial]);

  const parsed = useMemo(() => {
    if (!text.trim()) return { error: "DSL が空です" as string | null, nodes: [] as MindNode[] };
    const r = parseDSL(text, state.currentBoardId ?? "");
    if (!r) return { error: "DSL の形式が不正です。ヘッダ `mindmap`・インデント・属性値を確認してください。", nodes: [] };
    return { error: null, nodes: r.nodes };
  }, [text, state.currentBoardId]);

  const canApply = parsed.error === null && parsed.nodes.length > 0;

  function onApply() {
    if (parsed.error || !state.currentBoardId) return;
    if (
      !window.confirm(
        `DSL を適用するとボード「${board?.name ?? ""}」のタスクがすべて置き換わり、ボード名も「${parsed.nodes.find((n) => n.isRoot)?.text ?? ""}」に変更されます。続行しますか?`,
      )
    ) {
      return;
    }
    const record: Record<string, MindNode> = {};
    for (const n of parsed.nodes) record[n.id] = n;
    const newRootName = parsed.nodes.find((n) => n.isRoot)?.text ?? "";
    if (newRootName && board && newRootName !== board.name) {
      dispatch({ type: "RENAME_BOARD", id: state.currentBoardId, name: newRootName });
    }
    dispatch({ type: "SET_NODES", nodes: record });
  }

  return (
    <div
      data-testid="text-editor"
      className="w-full h-full flex flex-col gap-3 p-4 overflow-hidden"
    >
      <div className="flex flex-1 gap-3 min-h-0">
        <textarea
          data-testid="text-editor-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="flex-1 min-w-0 p-3 text-sm font-mono rounded resize-none outline-none"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
            minHeight: "320px",
          }}
        />
        <div
          className="flex-1 min-w-0 p-3 rounded overflow-y-auto"
          style={{
            background: "var(--toolbar-bg)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--mid)" }}>
            プレビュー ({parsed.nodes.length} ノード)
          </div>
          <Preview nodes={parsed.nodes} error={parsed.error} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 shrink-0">
        <button
          type="button"
          data-testid="text-editor-reset"
          onClick={() => setText(serializeDSL({ name: board?.name ?? "" }, state.nodes))}
          className="px-3 py-1.5 text-sm rounded transition"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
        >
          リセット
        </button>
        <button
          type="button"
          data-testid="text-editor-apply"
          onClick={onApply}
          disabled={!canApply}
          className="px-3 py-1.5 text-sm rounded transition disabled:opacity-50"
          style={{
            background: "var(--terra)",
            color: "var(--paper)",
          }}
        >
          適用
        </button>
      </div>
    </div>
  );
}
