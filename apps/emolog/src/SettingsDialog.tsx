import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, ConfirmDialog, Modal } from "@mijime/theme/ui";
import type { ExportData } from "./types";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: () => Promise<void>;
  onImport: (data: ExportData) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  locationEnabled: boolean;
  onLocationEnabledChange: (enabled: boolean) => void;
}

export function SettingsDialog({
  open,
  onClose,
  onExport,
  onImport,
  onDeleteAll,
  locationEnabled,
  onLocationEnabledChange,
}: SettingsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    await onDeleteAll();
    setConfirmDelete(false);
  }

  return (
    <>
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
          <label className="emolog-settings-location">
            <input
              type="checkbox"
              checked={locationEnabled}
              onChange={(e) => onLocationEnabledChange(e.target.checked)}
            />
            <span>
              位置情報を記録する
              <small>記録時に現在地を保存します。エクスポートにも含まれます。</small>
            </span>
          </label>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} className="justify-start">
            <Trash2 size={14} /> すべてのデータを削除
          </Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        title="すべてのデータを削除"
        description="この操作は取り消せません。"
        tone="danger"
        confirmLabel="すべて削除"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDeleteAll}
      >
        <p className="text-sm">すべての記録を完全に削除します。よろしいですか？</p>
      </ConfirmDialog>
    </>
  );
}
