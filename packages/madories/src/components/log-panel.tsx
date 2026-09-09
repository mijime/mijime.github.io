import { clearLogs, downloadLogs, useLogs, type LogLevel } from "../log";

const LEVEL_COLOR: Record<LogLevel, string> = {
  error: "var(--terra)",
  info: "var(--ink)",
  warn: "#b58900",
};

export function LogPanel({ onClose }: { onClose: () => void }) {
  const logs = useLogs();
  return (
    <div
      style={{
        background: "var(--toolbar)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        maxHeight: "min(70vh, 480px)",
        padding: "10px",
        width: "min(420px, 90vw)",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <span
          style={{
            color: "var(--mid)",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "10px",
            letterSpacing: "0.12em",
          }}
        >
          ログ ({logs.length})
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={downloadLogs} style={btn} title="テキストで保存">
            保存
          </button>
          <button onClick={clearLogs} style={btn} title="クリア">
            消去
          </button>
          <button onClick={onClose} style={btn}>
            ✕
          </button>
        </div>
      </div>
      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          flex: 1,
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "10px",
          lineHeight: 1.6,
          minHeight: "120px",
          overflowY: "auto",
          padding: "6px 8px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {logs.length === 0 ? (
          <span style={{ color: "var(--mid)" }}>ログはまだありません</span>
        ) : (
          logs.map((e, i) => (
            <div key={i} style={{ color: LEVEL_COLOR[e.level] }}>
              [{e.time}] {e.level.toUpperCase()} {e.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  color: "var(--ink)",
  cursor: "pointer",
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "11px",
  padding: "3px 8px",
};
