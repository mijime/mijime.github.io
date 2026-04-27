import { useEffect, useState } from "react";
import { dslToFloor, floorToDsl } from "../floor/dsl";
import type { FloorPlan } from "../types";

interface Props {
  floor: FloorPlan;
  onImportFloor: (floor: FloorPlan) => void;
}

export function DslPanel({ floor, onImportFloor }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => floorToDsl(floor));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(floorToDsl(floor));
    setError(null);
  }, [floor.id, floor]);

  function handleImport() {
    try {
      const imported = dslToFloor(text);
      onImportFloor(imported);
      setError(null);
    } catch (error) {
      setError(String(error));
    }
  }

  const mono: React.CSSProperties = {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: "11px",
  };

  if (!open) {
    return (
      <div className="hidden md:flex">
        <div style={{ background: "var(--toolbar-bg)", borderLeft: "1px solid var(--border)" }}>
          <button
            onClick={() => {
              setText(floorToDsl(floor));
              setOpen(true);
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
      <button
        onClick={() => setText(floorToDsl(floor))}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--ink)",
          cursor: "pointer",
          padding: "3px 8px",
          textAlign: "left",
          ...mono,
        }}
      >
        現在フロアを表示
      </button>
      <button
        onClick={handleImport}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--ink)",
          cursor: "pointer",
          padding: "3px 8px",
          textAlign: "left",
          ...mono,
        }}
      >
        新フロアとして追加
      </button>
    </div>
  );
}
