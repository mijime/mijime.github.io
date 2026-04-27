import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { floorsToText, textToFloors } from "../floor/share";
import type { FloorPlan } from "../types";

interface Props {
  floors: FloorPlan[];
  onApplyFloors: (floors: FloorPlan[]) => void;
}

export function DslPanel({ floors, onApplyFloors }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    padding: "3px 8px",
    ...mono,
  };

  if (!open) {
    return (
      <div className="hidden md:flex">
        <div style={{ background: "var(--toolbar-bg)", borderLeft: "1px solid var(--border)" }}>
          <button
            onClick={() => {
              setOpen(true);
              setText(floorsToText(floors));
              setError(null);
            }}
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
      </div>
    );
  }

  return (
    <div
      className="hidden md:flex"
      style={{
        background: "var(--toolbar-bg)",
        borderLeft: "1px solid var(--border)",
        flexDirection: "column",
        gap: "6px",
        padding: "10px 8px",
        width: "220px",
        ...mono,
      }}
    >
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
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
          onClick={() => setOpen(false)}
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
      <textarea
        value={text}
        onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
        spellCheck={false}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--border)",
          color: "var(--ink)",
          flex: 1,
          minHeight: "300px",
          padding: "6px",
          resize: "vertical",
          ...mono,
        }}
      />
      {error && (
        <div style={{ color: "var(--terra)", fontSize: "10px", wordBreak: "break-all" }}>
          {error}
        </div>
      )}
      <button onClick={handleExport} style={btnStyle}>
        <Download size={14} /> export
      </button>
      <button onClick={handleApply} style={btnStyle}>
        <Upload size={14} /> apply
      </button>
    </div>
  );
}
