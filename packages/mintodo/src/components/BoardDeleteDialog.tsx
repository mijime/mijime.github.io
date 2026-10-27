import { ConfirmDialog } from "@mijime/theme/ui";
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
    <ConfirmDialog
      open
      title="ボードを削除"
      tone="danger"
      confirmLabel="削除"
      onCancel={close}
      onConfirm={onConfirm}
    >
      <p className="text-sm">
        「<span className="font-semibold">{modal.boardName}</span>」を削除しますか?
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
        このボードのすべてのタスクが削除されます。この操作は取り消せません。
      </p>
    </ConfirmDialog>
  );
}
