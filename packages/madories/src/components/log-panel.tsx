import { X } from "lucide-react";
import { Button, Card, IconButton } from "@mijime/theme/ui";
import { clearLogs, downloadLogs, useLogs, type LogLevel } from "../log";

const LEVEL_COLOR: Record<LogLevel, string> = {
  error: "var(--danger)",
  info: "var(--fg)",
  warn: "var(--warning)",
};

export function LogPanel({ onClose }: { onClose: () => void }) {
  const logs = useLogs();
  return (
    <Card
      tone="raised"
      padding="sm"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        maxHeight: "min(70vh, 480px)",
        width: "min(420px, 90vw)",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <span
          style={{
            color: "var(--muted)",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "10px",
            letterSpacing: "0.12em",
          }}
        >
          ログ ({logs.length})
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <Button variant="ghost" size="sm" onClick={downloadLogs} title="テキストで保存">
            保存
          </Button>
          <Button variant="ghost" size="sm" onClick={clearLogs} title="クリア">
            消去
          </Button>
          <IconButton label="閉じる" size="icon-sm" onClick={onClose}>
            <X size={12} />
          </IconButton>
        </div>
      </div>
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
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
          <span style={{ color: "var(--muted)" }}>ログはまだありません</span>
        ) : (
          logs.map((e, i) => (
            <div key={i} style={{ color: LEVEL_COLOR[e.level] }}>
              [{e.time}] {e.level.toUpperCase()} {e.message}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
