import { useEffect, useState } from "react";
import {
  Download,
  FolderOpen,
  Link,
  Maximize2,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { btnBase } from "./styles";

type ActionTab = "edit" | "file" | "operation";

interface ActionItem {
  disabled: boolean;
  icon: React.ReactNode;
  id: string;
  onClick: () => void;
  title: string;
}

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFitView: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportAll: () => void;
  onShare: () => void;
  onClear: () => void;
  onRotateFloor: () => void;
  onClose?: () => void;
}

export function ActionTabs({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFitView,
  onSave,
  onLoad,
  onExportAll,
  onShare,
  onClear,
  onRotateFloor,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<ActionTab>("edit");
  const [clearPending, setClearPending] = useState(false);

  useEffect(() => {
    if (!clearPending) return;
    const id = setTimeout(() => setClearPending(false), 3000);
    return () => clearTimeout(id);
  }, [clearPending]);

  const editActions: ActionItem[] = [
    { disabled: !canUndo, icon: <Undo2 size={14} />, id: "undo", onClick: onUndo, title: "戻す" },
    { disabled: !canRedo, icon: <Redo2 size={14} />, id: "redo", onClick: onRedo, title: "進む" },
  ];

  const fileActions: ActionItem[] = [
    { disabled: false, icon: <Save size={14} />, id: "save", onClick: () => { onSave(); onClose?.(); }, title: "保存" },
    { disabled: false, icon: <FolderOpen size={14} />, id: "load", onClick: () => { onLoad(); onClose?.(); }, title: "読込" },
    { disabled: false, icon: <Download size={14} />, id: "export", onClick: () => { onExportAll(); onClose?.(); }, title: "書出" },
    { disabled: false, icon: <Link size={14} />, id: "share", onClick: () => { onShare(); onClose?.(); }, title: "共有" },
  ];

  const operationActions: ActionItem[] = [
    { disabled: false, icon: <Maximize2 size={14} />, id: "fitView", onClick: onFitView, title: "全体表示" },
    { disabled: false, icon: <RotateCw size={14} />, id: "rotate", onClick: () => { onRotateFloor(); onClose?.(); }, title: "回転" },
  ];

  const tabDefs: { key: ActionTab; label: string; actions: ActionItem[] }[] = [
    { key: "edit", label: "編集", actions: editActions },
    { key: "file", label: "ファイル", actions: fileActions },
    { key: "operation", label: "操作", actions: operationActions },
  ];

  const currentActions = tabDefs.find((t) => t.key === activeTab)?.actions ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {tabDefs.map(({ key, label }) => (
          <button
            key={key}
            aria-pressed={activeTab === key}
            style={{
              ...btnBase,
              background: activeTab === key ? "var(--ink)" : "transparent",
              borderRadius: "4px",
              color: activeTab === key ? "var(--paper)" : "var(--ink)",
              flex: 1,
              padding: "4px 0",
            }}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        {currentActions.map(({ icon, id, onClick, title, disabled }) => (
          <button
            key={id}
            aria-label={title}
            title={title}
            disabled={disabled}
            onClick={onClick}
            style={{
              ...btnBase,
              alignItems: "center",
              borderRadius: "4px",
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              flex: 1,
              justifyContent: "center",
              opacity: disabled ? 0.4 : 1,
              padding: "6px 0",
            }}
          >
            {icon}
          </button>
        ))}
      </div>
      {activeTab === "operation" && (
        <button
          onClick={() => {
            if (!clearPending) {
              setClearPending(true);
            } else {
              setClearPending(false);
              onClear();
              onClose?.();
            }
          }}
          title="全面削除"
          style={{
            ...btnBase,
            alignItems: "center",
            borderRadius: "4px",
            color: "var(--terra)",
            display: "flex",
            gap: "4px",
            justifyContent: "center",
            padding: "6px 0",
          }}
        >
          <Trash2 size={14} />
          <span>{clearPending ? "本当に削除？" : "削除"}</span>
        </button>
      )}
    </div>
  );
}
