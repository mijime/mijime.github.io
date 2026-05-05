import { Pencil } from "lucide-react";
import { useState } from "react";
import type { ToolMode } from "./tool-mode";
import { PrimaryToolTabs } from "./tool-sheet/primary-tool-tabs";
import { SubPanels } from "./tool-sheet/sub-panels";
import { ActionTabs } from "./tool-sheet/action-tabs";

interface Props {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  onSave: () => void;
  onLoad: () => void;
  onExportAll: () => void;
  onShare: () => void;
  onClear: () => void;
  onRotateFloor: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFitView: () => void;
  darkMode: boolean;
  viewMode: "2d" | "3d";
  onToggleViewMode: () => void;
}

function ToolPanelContent({
  tool,
  onToolChange,
  onSave,
  onLoad,
  onExportAll,
  onShare,
  onClear,
  onRotateFloor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFitView,
  darkMode,
  viewMode,
  onToggleViewMode,
  onClose,
}: Props & { onClose?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
        overflow: "hidden",
        padding: "12px 10px",
      }}
    >
      <PrimaryToolTabs tool={tool} onToolChange={onToolChange} />
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <SubPanels tool={tool} onToolChange={onToolChange} darkMode={darkMode} />
      </div>
      <div
        style={{
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          paddingTop: "12px",
        }}
      >
        <ActionTabs
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          onFitView={onFitView}
          onSave={onSave}
          onLoad={onLoad}
          onExportAll={onExportAll}
          onShare={onShare}
          onClear={onClear}
          onRotateFloor={onRotateFloor}
          onClose={onClose}
          viewMode={viewMode}
          onToggleViewMode={onToggleViewMode}
        />
      </div>
    </div>
  );
}

export function ToolSheet(props: Props) {
  const [open, setOpen] = useState(false);
  const currentLabel =
    { wall: "壁", floor: "床", item: "家具", erase: "消す", select: "選択" }[props.tool.kind] ??
    "家具";

  return (
    <>
      <div
        className="hidden md:flex flex-col overflow-hidden"
        style={{
          background: "var(--toolbar)",
          borderRight: "1px solid var(--border)",
          fontFamily: "IBM Plex Mono, monospace",
          height: "100%",
          width: "260px",
        }}
      >
        <ToolPanelContent {...props} />
      </div>

      <button
        className="md:hidden fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5"
        style={{ background: "var(--accent)", color: "var(--paper)" }}
        onClick={() => setOpen(true)}
        aria-label="ツール選択"
      >
        <Pencil size={20} />
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px" }}>
          {currentLabel}
        </span>
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-xl transition-transform duration-200"
        style={{
          background: "var(--toolbar)",
          borderTop: "2px solid var(--border)",
          maxHeight: "80vh",
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div
            style={{
              background: "var(--border)",
              borderRadius: "9999px",
              height: "4px",
              width: "40px",
            }}
          />
        </div>
        <ToolPanelContent {...props} onClose={() => setOpen(false)} />
      </div>
    </>
  );
}
