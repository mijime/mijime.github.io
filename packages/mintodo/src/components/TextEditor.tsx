import { useEffect, useMemo, useRef, useState } from "react";
import { parseDSL, serializeDSL } from "../dsl";
import { useBoardActions } from "../hooks/use-board-actions";
import { useMindStore } from "../hooks/use-mind-store";
import type { MindNode } from "../types";

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

  const canApply = useMemo(() => {
    if (!text.trim()) return false;
    const r = parseDSL(text, state.currentBoardId ?? "");
    return r !== null && r.nodes.length > 0;
  }, [text, state.currentBoardId]);

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
    if (!state.currentBoardId) return;
    const r = parseDSL(text, state.currentBoardId);
    if (!r) return;
    if (
      !window.confirm(
        `DSL を適用するとボード「${board?.name ?? ""}」のタスクがすべて置き換わり、ボード名も「${r.nodes.find((n) => n.isRoot)?.text ?? ""}」に変更されます。続行しますか?`,
      )
    ) {
      return;
    }
    const record: Record<string, MindNode> = {};
    for (const n of r.nodes) record[n.id] = n;
    const newRootName = r.nodes.find((n) => n.isRoot)?.text ?? "";
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
      className="w-full h-full flex flex-col overflow-hidden"
    >
      <textarea
        data-testid="text-editor-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="flex-1 w-full px-8 py-6 text-base font-mono resize-none outline-none border-0"
        style={{
          background: "transparent",
          color: "var(--ink)",
        }}
      />
      <div
        className="flex items-center justify-end gap-2 px-6 py-3 shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
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
