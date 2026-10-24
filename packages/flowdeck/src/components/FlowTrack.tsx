import { useId } from "react";

const STATIONS = [
  { key: "open", label: "Backlog", color: "#0284c7" },
  { key: "inbox", label: "Ready", color: "#7c3aed" },
  { key: "wip", label: "In Progress", color: "#2563eb" },
  { key: "test", label: "Review", color: "#d97706" },
  { key: "done", label: "Done", color: "#059669" },
] as const;

export type FlowCounts = Record<(typeof STATIONS)[number]["key"], number>;

export function FlowTrack({ counts, onFelt = false }: { counts?: FlowCounts; onFelt?: boolean }) {
  const id = useId().replace(/:/g, "");
  const markerId = `flow-arrow-${id}`;
  const active = counts ? ([counts.inbox, counts.wip, counts.test] as const) : null;
  const max = active ? Math.max(...active) : 0;
  const bottleneck =
    counts && max > 0
      ? ((["inbox", "wip", "test"] as const).find((key) => counts[key] === max) ?? null)
      : null;
  const xs = STATIONS.map((_, index) => 46 + index * 132);
  const ring = onFelt ? "var(--paper)" : "var(--border)";

  return (
    <svg
      viewBox="0 0 620 58"
      className={`block h-[58px] w-full ${onFelt ? "text-(--tac-ink)" : "text-(--mid)"}`}
      role="img"
      aria-label={
        counts
          ? STATIONS.map((station) => `${station.label} ${counts[station.key]}`).join(" / ")
          : "Backlog から Done までの流れ"
      }
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 6 6"
          refX="5"
          refY="3"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L6 3 L0 6 z" fill="currentColor" opacity="0.45" />
        </marker>
      </defs>
      <path
        d={`M ${xs[0] ?? 0} 24 H ${xs[xs.length - 1] ?? 0}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="2 6"
        strokeLinecap="round"
        opacity="0.35"
        markerEnd={`url(#${markerId})`}
      />
      {STATIONS.map((station, index) => {
        const highlight = station.key === bottleneck;
        const x = xs[index] ?? 46;
        return (
          <g key={station.key}>
            {highlight && (
              <circle
                cx={x}
                cy="24"
                r="18"
                fill="none"
                stroke="var(--terra)"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
            )}
            <circle cx={x} cy="24" r="13" fill={station.color} stroke={ring} strokeWidth="2" />
            {counts ? (
              <text
                x={x}
                y="27.5"
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#ffffff"
              >
                {counts[station.key]}
              </text>
            ) : (
              <circle cx={x} cy="24" r="3.5" fill="#ffffff" opacity="0.9" />
            )}
            <text x={x} y="52" textAnchor="middle" fontSize="8" fill="currentColor">
              {station.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
