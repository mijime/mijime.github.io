import { useEffect, useState } from "react";
import { useMindStore } from "../hooks/use-mind-store";

const MAX_NAME = 50;

export function BoardNameDialog() {
  const { state, dispatch } = useMindStore();
  const { modal } = state;
  const open = modal?.kind === "board-name";
  const initial = open ? (modal.initialName ?? "") : "";
  const [name, setName] = useState(initial);

  useEffect(() => {
    if (open) setName(initial);
  }, [open, initial]);

  if (!open) return null;

  const close = () => dispatch({ modal: null, type: "OPEN_MODAL" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const event = new CustomEvent<{ name: string; mode: "create" | "rename"; boardId?: string }>(
      "board-name-submit",
      { detail: { name: trimmed, mode: modal.mode, boardId: modal.boardId } },
    );
    window.dispatchEvent(event);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={close}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="rounded p-6 w-[420px] max-w-[90vw]"
        style={{ background: "var(--paper)", border: "1px solid var(--border)" }}
      >
        <h2
          className="text-lg mb-4"
          style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600, color: "var(--ink)" }}
        >
          {modal.mode === "create" ? "新しいボード" : "ボード名を変更"}
        </h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
          maxLength={MAX_NAME}
          placeholder="例: メインプロジェクト"
          className="w-full px-3 py-2 text-sm rounded outline-none"
          style={{
            background: "var(--toolbar-bg)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
        />
        <div className="text-xs mt-1" style={{ color: "var(--mid)" }}>
          {name.length} / {MAX_NAME}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 text-sm rounded transition"
            style={{
              background: "var(--paper)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
            }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded transition disabled:opacity-50"
            style={{ background: "var(--terra)", color: "var(--paper)" }}
          >
            {modal.mode === "create" ? "作成" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
