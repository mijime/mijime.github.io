import { useEffect, useState } from "react";
import { useMindStore } from "../hooks/use-mind-store";

const MAX_NAME = 50;

export function BoardNameDialog() {
  const { state, dispatch } = useMindStore();
  const modal = state.modal;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl w-[420px] max-w-[90vw]"
      >
        <h2 className="text-lg font-bold mb-4">
          {modal.mode === "create" ? "新しいボード" : "ボード名を変更"}
        </h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
          maxLength={MAX_NAME}
          placeholder="例: メインプロジェクト"
          className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-indigo-500 rounded-xl outline-none"
        />
        <div className="text-xs text-slate-500 mt-1">{name.length} / {MAX_NAME}</div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {modal.mode === "create" ? "作成" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
