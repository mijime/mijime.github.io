import { useEffect, useState } from "react";
import { Button, Field, Input, Modal } from "@mijime/theme/ui";
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
    const trimmed = name.trim().slice(0, MAX_NAME);
    if (!trimmed) return;
    const event = new CustomEvent<{ name: string; mode: "create" | "rename"; boardId?: string }>(
      "board-name-submit",
      { detail: { name: trimmed, mode: modal.mode, boardId: modal.boardId } },
    );
    window.dispatchEvent(event);
    close();
  };

  return (
    <Modal
      open
      onClose={close}
      title={modal.mode === "create" ? "新しいボード" : "ボード名を変更"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={close}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="board-name-form"
            disabled={!name.trim()}
          >
            {modal.mode === "create" ? "作成" : "保存"}
          </Button>
        </>
      }
    >
      <form id="board-name-form" onSubmit={onSubmit}>
        <Field label="ボード名" hint={`${name.length} / ${MAX_NAME}`} htmlFor="board-name-input">
          <Input
            id="board-name-input"
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setName((value) => value.slice(0, MAX_NAME))}
            maxLength={MAX_NAME}
            placeholder="例: メインプロジェクト"
          />
        </Field>
      </form>
    </Modal>
  );
}
