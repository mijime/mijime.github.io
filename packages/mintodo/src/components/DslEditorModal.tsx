import { useCallback, useEffect, useState } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import { parseDSL, serializeDSL } from "../dsl";
import type { MindNode } from "../types";

export function DslEditorModal() {
  const { state, dispatch } = useMindStore();
  const actions = useBoardActions();
  const open = state.modal?.kind === "dsl-editor";
  const close = useCallback(() => dispatch({ modal: null, type: "OPEN_MODAL" }), [dispatch]);

  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const board = state.boards.find((b) => b.id === state.currentBoardId);
    setText(serializeDSL({ name: board?.name ?? "" }, state.nodes));
    setError(null);
  }, [open, state.currentBoardId, state.boards, state.nodes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const onSave = async () => {
    setError(null);
    const parsed = parseDSL(text, state.currentBoardId ?? "");
    if (!parsed) {
      setError("DSL の形式が不正です。インデント・属性値を確認してください。");
      return;
    }
    const boardName = state.boards.find((b) => b.id === state.currentBoardId)?.name ?? "";
    const ok = window.confirm(
      `DSL を適用するとボード「${boardName}」のタスクがすべて置き換わり、ボード名も「${parsed.board.name}」に変更されます。続行しますか?`,
    );
    if (!ok) return;
    await actions.renameBoard(state.currentBoardId!, parsed.board.name);
    const rec: Record<string, MindNode> = {};
    for (const n of parsed.nodes) rec[n.id] = n;
    dispatch({ nodes: rec, type: "SET_NODES" });
    close();
  };

  const onTextareaKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void onSave();
    }
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
        className="w-full max-w-[720px] rounded overflow-hidden"
        style={{ background: "var(--paper)", border: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-lg"
            style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600, color: "var(--ink)" }}
          >
            DSL 編集
          </h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="p-1 rounded"
            style={{ color: "var(--mid)" }}
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onTextareaKey}
            spellCheck={false}
            className="w-full rounded p-3 outline-none text-sm"
            style={{
              minHeight: "320px",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              background: "var(--toolbar-bg)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              resize: "vertical",
            }}
          />
          {error && (
            <p className="mt-2 text-sm" style={{ color: "var(--terra)" }} role="alert">
              ⚠ {error}
            </p>
          )}
          <p className="mt-2 text-xs" style={{ color: "var(--mid)" }}>
            Cmd/Ctrl+Enter で SAVE / Esc でキャンセル
          </p>
        </div>
        <div
          className="flex justify-end gap-2 p-4"
          style={{ background: "var(--toolbar-bg)", borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 rounded text-sm font-medium transition"
            style={{
              background: "var(--paper)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            className="px-5 py-2 rounded text-sm font-semibold transition"
            style={{ background: "var(--terra)", color: "var(--paper)" }}
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
