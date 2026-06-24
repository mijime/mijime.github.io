import { useEffect, useMemo, useRef, useState } from "react";
import { parseDSL, serializeDSL } from "../dsl";
import { useBoardActions } from "../hooks/use-board-actions";
import { useMindStore } from "../hooks/use-mind-store";
import { statusDotClass } from "../lib/badges";
import type { MindNode } from "../types";

interface PreviewProps {
  nodes: MindNode[];
  error: string | null;
}

function nodeDepth(record: Record<string, MindNode>, id: string): number {
  let d = 0;
  let cur = record[id];
  while (cur && !cur.isRoot) {
    const parent = record[cur.parentId ?? ""];
    if (!parent) break;
    cur = parent;
    d++;
  }
  return d;
}

function Preview({ nodes, error }: PreviewProps) {
  if (error) {
    return (
      <div data-testid="text-editor-error" className="text-sm text-rose-500 dark:text-rose-400">
        {error}
      </div>
    );
  }
  if (nodes.length === 0) {
    return (
      <div className="text-sm" style={{ color: "var(--mid)" }}>
        (ノードなし)
      </div>
    );
  }
  const record: Record<string, MindNode> = {};
  for (const n of nodes) record[n.id] = n;
  return (
    <ul data-testid="text-editor-preview" className="text-sm flex flex-col gap-0.5 font-mono">
      {nodes.map((n) => {
        const depth = nodeDepth(record, n.id);
        const attrs = [
          n.priority !== "medium" && `priority:${n.priority}`,
          n.categoryColor !== "slate" && `color:${n.categoryColor}`,
          n.dueDate && `due:${n.dueDate}`,
          n.status !== "inbox" && `status:${n.status}`,
          n.completed && "done",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <li
            key={n.id}
            className="flex items-center gap-2"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass(n.status)}`}
              title={n.status}
            />
            <span style={{ color: "var(--ink)" }}>{n.text}</span>
            {attrs && (
              <span className="text-[10px]" style={{ color: "var(--mid)" }}>
                [{attrs}]
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TextEditor() {
  const { state, dispatch } = useMindStore();
  const board = state.boards.find((b) => b.id === state.currentBoardId);
  const actions = useBoardActions();

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
    if (!r)
      return {
        error: "DSL の形式が不正です。ヘッダ `mindmap`・インデント・属性値を確認してください。",
        nodes: [],
      };
    return { error: null, nodes: r.nodes };
  }, [text, state.currentBoardId]);

  const canApply = parsed.error === null && parsed.nodes.length > 0;

  const onApplyRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void onApplyRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function onApply() {
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
      await actions.renameBoard(state.currentBoardId, newRootName);
    }
    dispatch({ type: "SET_NODES", nodes: record });
  }
  useEffect(() => {
    onApplyRef.current = onApply;
  });

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
          <div
            className="text-[10px] uppercase tracking-wider mb-2"
            style={{ color: "var(--mid)" }}
          >
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
