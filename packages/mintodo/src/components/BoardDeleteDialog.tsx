import { useMindStore } from "../hooks/use-mind-store";

export function BoardDeleteDialog() {
  const { state, dispatch } = useMindStore();
  const modal = state.modal;
  const open = modal?.kind === "board-delete";
  if (!open) return null;

  const close = () => dispatch({ modal: null, type: "OPEN_MODAL" });

  const onConfirm = () => {
    const event = new CustomEvent<{ boardId: string }>("board-delete-confirm", {
      detail: { boardId: modal.boardId },
    });
    window.dispatchEvent(event);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl w-[420px] max-w-[90vw]"
      >
        <h2 className="text-lg font-bold mb-2">ボードを削除</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
          「<span className="font-semibold">{modal.boardName}</span>」を削除しますか?
        </p>
        <p className="text-xs text-rose-600 dark:text-rose-400 mb-4">
          このボードのすべてのタスクが削除されます。この操作は取り消せません。
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-xl bg-rose-600 text-white hover:bg-rose-700"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
