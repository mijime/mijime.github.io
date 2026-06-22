import { useMindStore } from "../hooks/use-mind-store";

export function BoardDeleteDialog() {
  const { state, dispatch } = useMindStore();
  const { modal } = state;
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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded p-6 w-[420px] max-w-[90vw]"
        style={{ background: "var(--paper)", border: "1px solid var(--border)" }}
      >
        <h2
          className="text-lg mb-2"
          style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600, color: "var(--ink)" }}
        >
          ボードを削除
        </h2>
        <p className="text-sm mb-1" style={{ color: "var(--ink)" }}>
          「<span style={{ fontWeight: 600 }}>{modal.boardName}</span>」を削除しますか?
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--terra)" }}>
          このボードのすべてのタスクが削除されます。この操作は取り消せません。
        </p>
        <div className="flex justify-end gap-2">
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
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded transition"
            style={{ background: "var(--terra)", color: "var(--paper)" }}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
