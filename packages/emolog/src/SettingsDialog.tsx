import { useRef } from "react";
import { Button, Modal } from "@mijime/theme/ui";
import type { ExportData } from "./types";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: () => Promise<void>;
  onImport: (data: ExportData) => Promise<void>;
  onDeleteAll: () => Promise<void>;
}

export function SettingsDialog({
  open,
  onClose,
  onExport,
  onImport,
  onDeleteAll,
}: SettingsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  async function handleExport() {
    try {
      await onExport();
    } catch {
      // Handled by parent
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;
      if (!data.entries || !Array.isArray(data.entries) || data.version === undefined) {
        alert("無効なファイル形式です");
        return;
      }
      await onImport(data);
    } catch {
      alert("ファイルの読み込みに失敗しました");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAll() {
    if (
      !window.confirm(
        "すべてのデータを完全に削除します。この操作は取り消せません。\nよろしいですか？",
      )
    )
      return;
    await onDeleteAll();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="設定"
      size="sm"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          閉じる
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={handleExport} className="justify-start">
          📤 データをエクスポート
        </Button>
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          className="justify-start"
        >
          📥 データをインポート
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        <Button variant="danger" onClick={handleDeleteAll} className="justify-start">
          🗑️ すべてのデータを削除
        </Button>
      </div>
    </Modal>
  );
}
