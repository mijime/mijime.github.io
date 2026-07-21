import { useRef } from "react";
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
    <div className="emolog-settings-overlay" onClick={onClose}>
      <div className="emolog-settings" onClick={(e) => e.stopPropagation()}>
        <h3 className="emolog-settings-title">設定</h3>
        <div className="emolog-settings-actions">
          <button onClick={handleExport} className="emolog-settings-btn">
            📤 データをエクスポート
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="emolog-settings-btn">
            📥 データをインポート
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          <button onClick={handleDeleteAll} className="emolog-settings-btn emolog-settings-danger">
            🗑️ すべてのデータを削除
          </button>
        </div>
        <button onClick={onClose} className="emolog-settings-close">
          閉じる
        </button>
      </div>
    </div>
  );
}
