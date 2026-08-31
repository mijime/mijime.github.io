import { Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { floorsToText, textToFloors } from "../floor/share";
import type { FloorPlan } from "../types";
import { BottomSheet } from "./bottom-sheet";

interface Props {
  floors: FloorPlan[];
  onApplyFloors: (floors: FloorPlan[]) => void;
  open: boolean;
  onToggle: () => void;
}

function DslHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          color: "var(--mid)",
          fontSize: "9px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        DSL
      </div>
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--mid)",
          cursor: "pointer",
          fontSize: "13px",
          padding: "0",
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function DslPanel({ floors, onApplyFloors, open, onToggle }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  // Auto-fill with the current plan's DSL when the panel opens.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setText(floorsToText(floors));
      setError(null);
    }
    wasOpenRef.current = open;
  }, [floors, open]);

  function handleExport() {
    setText(floorsToText(floors));
    setError(null);
  }

  function handleApply() {
    try {
      const imported = textToFloors(text);
      onApplyFloors(imported);
      setError(null);
    } catch (error) {
      setError(String(error));
    }
  }

  const mono: React.CSSProperties = {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: "11px",
  };

  const btnStyle: React.CSSProperties = {
    alignItems: "center",
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--ink)",
    cursor: "pointer",
    display: "flex",
    gap: "6px",
    justifyContent: "center",
    padding: "8px 8px",
    ...mono,
  };

  const editor = (
    <>
      <textarea
        value={text}
        onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
        spellCheck={false}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--border)",
          color: "var(--ink)",
          flex: 1,
          minHeight: "120px",
          padding: "6px",
          resize: "vertical",
          width: "100%",
          ...mono,
        }}
      />
      {error && (
        <div style={{ color: "var(--terra)", fontSize: "10px", wordBreak: "break-all" }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: "6px" }}>
        <button onClick={handleExport} className="flex-1 md:flex-none" style={btnStyle}>
          <Download size={14} /> export
        </button>
        <button onClick={handleApply} className="flex-1 md:flex-none" style={btnStyle}>
          <Upload size={14} /> apply
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: vertical toggle or side panel */}
      <div className="hidden md:flex">
        {open ? (
          <div
            className="flex flex-col"
            style={{
              background: "var(--toolbar-bg)",
              borderLeft: "1px solid var(--border)",
              gap: "6px",
              padding: "10px 8px",
              width: "220px",
              ...mono,
            }}
          >
            <DslHeader onClose={onToggle} />
            {editor}
          </div>
        ) : (
          <div style={{ background: "var(--toolbar-bg)", borderLeft: "1px solid var(--border)" }}>
            <button
              onClick={onToggle}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--mid)",
                cursor: "pointer",
                fontSize: "9px",
                letterSpacing: "0.15em",
                padding: "10px 6px",
                textTransform: "uppercase",
                writingMode: "vertical-rl",
                ...mono,
              }}
            >
              DSL ▶
            </button>
          </div>
        )}
      </div>

      {/* Mobile: bottom sheet */}
      <BottomSheet open={open} onClose={onToggle} height="70vh" maxHeight="82vh">
        <div
          className="flex flex-1 flex-col gap-2"
          style={{ padding: "4px 12px calc(12px + env(safe-area-inset-bottom))", ...mono }}
        >
          <DslHeader onClose={onToggle} />
          <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
            {editor}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
