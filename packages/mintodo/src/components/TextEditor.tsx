import { useEffect, useMemo, useRef, useState } from "react";
import { parseDSL, serializeDSL } from "../dsl";
import { useMindStore } from "../hooks/use-mind-store";

export function TextEditor() {
  const { state, dispatch } = useMindStore();
  const board = state.boards.find((b) => b.id === state.currentBoardId);

  const initial = useMemo(
    () => serializeDSL(state.nodes),
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
    return r.ok;
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
    if (!r.ok) return;
    if (
      !window.confirm(
        `DSL を適用するとボード「${board?.name ?? ""}」のタスクがすべて置き換わります。続行しますか?`,
      )
    ) {
      return;
    }
    dispatch({ type: "SET_NODES", nodes: r.nodes });
  }
  useEffect(() => {
    onApplyRef.current = onApply;
  });

  return (
    <div data-testid="text-editor" className="w-full h-full flex flex-col overflow-hidden">
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
          onClick={() => setText(serializeDSL(state.nodes))}
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
