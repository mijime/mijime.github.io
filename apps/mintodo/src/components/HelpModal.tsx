import { Keyboard } from "lucide-react";
import { Button, Modal } from "@mijime/theme/ui";
import { useMindStore } from "../hooks/use-mind-store";

const SHORTCUTS: { desc: string; key: string }[] = [
  { desc: "子をインライン追加", key: "Tab" },
  { desc: "兄弟をインライン追加", key: "Enter" },
  { desc: "名前変更", key: "F2" },
  { desc: "折りたたみトグル", key: "C" },
  { desc: "詳細編集", key: "E" },
  { desc: "完了状態の切り替え", key: "Space" },
  { desc: "タスクを削除", key: "Delete" },
  { desc: "ツリー移動", key: "← → ↑ ↓" },
];

export function HelpModal() {
  const { state, dispatch } = useMindStore();
  if (state.modal?.kind !== "help") return null;
  const close = () => dispatch({ modal: null, type: "OPEN_MODAL" });
  return (
    <Modal
      open
      onClose={close}
      title={
        <span className="flex items-center gap-2">
          <Keyboard size={18} className="text-(--accent)" /> 操作ヘルプ ＆ ショートカットキー
        </span>
      }
      size="lg"
      footer={
        <Button variant="primary" size="sm" onClick={close}>
          閉じる
        </Button>
      }
    >
      <h4 className="mb-2 text-xs uppercase tracking-wider text-(--mid)">プロ向けショートカット</h4>
      <div className="grid grid-cols-2 gap-3 text-sm text-(--ink)">
        {SHORTCUTS.map((s) => (
          <div key={s.key} className="flex justify-between border-b border-(--grid) pb-1.5">
            <span>{s.desc}</span>
            <kbd className="rounded border border-(--border) bg-(--toolbar-bg) px-1.5 py-0.5 text-xs font-bold">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
