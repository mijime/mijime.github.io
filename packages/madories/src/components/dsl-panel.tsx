import { Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { floorsToText, textToFloors } from "../floor/share";
import type { FloorPlan } from "../types";

interface Props {
  floors: FloorPlan[];
  onApplyFloors: (floors: FloorPlan[]) => void;
  open: boolean;
  onToggle: () => void;
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
    flex: 1,
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
        <button onClick={handleExport} style={btnStyle}>
          <Download size={14} /> export
        </button>
        <button onClick={handleApply} style={btnStyle}>
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
                onClick={onToggle}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--mid)",
                  cursor: "pointer",
                  fontSize: "11px",
                  padding: "0",
                }}
              >
                ✕
              </button>
            </div>
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

      {/* Mobile: dimmed backdrop + bottom sheet */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={onToggle}
        />
      )}
      {open && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl shadow-xl"
          style={{
            background: "var(--toolbar)",
            borderTop: "2px solid var(--border)",
            gap: "8px",
            height: "70vh",
            maxHeight: "82vh",
            padding: "8px 12px calc(12px + env(safe-area-inset-bottom))",
            ...mono,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
            <div
              style={{
                background: "var(--border)",
                borderRadius: "9999px",
                height: "4px",
                width: "40px",
              }}
            />
          </div>
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
              onClick={onToggle}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--mid)",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              ✕
            </button>
          </div>
          {editor}
        </div>
      )}
    </>
  );
}
