import type { ReactNode } from "react";

export const mono = { fontFamily: "IBM Plex Mono, monospace" };

export function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--toolbar)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "10px",
        width: "230px",
      }}
    >
      {children}
    </div>
  );
}

export function PanelSection({
  children,
  gap = 6,
  padTop = 8,
}: {
  children: ReactNode;
  gap?: number;
  padTop?: number;
}) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: `${gap}px`,
        paddingTop: `${padTop}px`,
      }}
    >
      {children}
    </div>
  );
}

export function MiniRow({
  label,
  ok,
  value,
}: {
  label: string;
  ok: boolean | undefined;
  value: string;
}) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: "6px" }}>
      <span style={{ ...mono, color: "var(--mid)", fontSize: "10px", width: "58px" }}>{label}</span>
      <span
        style={{
          ...mono,
          color: ok ? "var(--ink)" : "var(--terra)",
          fontSize: "10px",
          flex: 1,
          textAlign: "right",
        }}
      >
        {value}
      </span>
      <span style={{ ...mono, color: ok ? "rgb(46,160,90)" : "var(--terra)", fontSize: "10px" }}>
        {ok === undefined ? "—" : ok ? "OK" : "NG"}
      </span>
    </div>
  );
}

export function Gauge({ label, have, need }: { label: string; have: number; need: number }) {
  const ok = have >= need;
  const pct = Math.min(100, need > 0 ? (have / need) * 100 : 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{ ...mono, color: "var(--mid)", fontSize: "10px", width: "24px" }}>{label}</span>
      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--border)",
          borderRadius: "3px",
          flex: 1,
          height: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: ok ? "rgb(46,160,90)" : "rgb(168,85,247)",
            height: "100%",
            width: `${pct}%`,
          }}
        />
      </div>
      <span style={{ ...mono, color: ok ? "var(--ink)" : "var(--terra)", fontSize: "10px" }}>
        {have.toFixed(1)}/{need.toFixed(1)}m
      </span>
    </div>
  );
}

export function CheckRow({
  checked,
  onChange,
  label,
  accent,
  divider,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  accent?: boolean;
  divider?: boolean;
}) {
  return (
    <label
      style={{
        alignItems: "center",
        cursor: "pointer",
        display: "flex",
        gap: "6px",
        ...(divider
          ? { borderTop: "1px solid var(--border)", marginTop: "2px", paddingTop: "4px" }
          : {}),
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ accentColor: "var(--terra)" }}
      />
      <span style={{ ...mono, color: accent ? "var(--terra)" : "var(--ink)", fontSize: "10px" }}>
        {label}
      </span>
    </label>
  );
}

export type OkState = boolean | undefined;

function okColor(ok: OkState): string {
  if (ok === undefined) {
    return "var(--mid)";
  }
  return ok ? "rgb(46,160,90)" : "rgb(217,58,45)";
}

/** Small OK/NG pill used in the summary bar. */
export function Chip({ label, ok, count }: { label: string; ok: OkState; count?: number }) {
  const color = okColor(ok);
  return (
    <span
      style={{
        alignItems: "center",
        background: "var(--paper)",
        border: `1px solid ${color}`,
        borderRadius: "999px",
        color,
        display: "inline-flex",
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: "9px",
        gap: "4px",
        padding: "2px 6px",
      }}
    >
      <span style={{ background: color, borderRadius: "50%", height: "6px", width: "6px" }} />
      {label}
      {count ? ` ×${count}` : ""}
    </span>
  );
}

export interface TabDef {
  id: string;
  label: string;
}

/** Segmented tab bar (fills the row). */
export function TabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: TabDef[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: "4px",
        paddingTop: "6px",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            background: active === t.id ? "var(--ink)" : "transparent",
            border: active === t.id ? "none" : "1px solid var(--border)",
            borderRadius: "4px",
            color: active === t.id ? "var(--paper)" : "var(--mid)",
            cursor: "pointer",
            flex: 1,
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "9px",
            padding: "3px 0",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
