type PileTone = "deck" | "discard" | "uncertainty";

const DEFAULT_LABEL: Record<PileTone, string> = {
  deck: "山札",
  discard: "捨て札",
  uncertainty: "不確実カード",
};

export function CardPile({
  tone,
  count,
  label,
}: {
  tone: PileTone;
  count: number;
  label?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1"
      title={`${label ?? DEFAULT_LABEL[tone]} ${count}`}
    >
      <svg viewBox="0 0 26 32" className="h-7 w-[23px] shrink-0" aria-hidden="true">
        {tone === "deck" && (
          <>
            <rect
              x="7"
              y="8"
              width="16"
              height="22"
              rx="2"
              fill="var(--paper)"
              stroke="var(--border)"
            />
            <rect
              x="4"
              y="5"
              width="16"
              height="22"
              rx="2"
              fill="var(--paper)"
              stroke="var(--border)"
            />
            <rect
              x="1"
              y="2"
              width="16"
              height="22"
              rx="2"
              fill="var(--paper)"
              stroke="var(--terra)"
            />
            <path
              d="M5 7h8M5 11h8M5 15h5"
              stroke="var(--terra)"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.5"
            />
          </>
        )}
        {tone === "discard" && (
          <g transform="rotate(-9 13 16)">
            <rect
              x="5"
              y="4"
              width="16"
              height="22"
              rx="2"
              fill="var(--paper)"
              stroke="var(--border)"
            />
            <path d="M9 10h8M9 14h5" stroke="var(--mid)" strokeWidth="1" strokeLinecap="round" />
            <path
              d="M8 21h8"
              stroke="var(--terra)"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.55"
            />
          </g>
        )}
        {tone === "uncertainty" && (
          <>
            <rect
              x="3"
              y="3"
              width="18"
              height="24"
              rx="2"
              fill="var(--paper)"
              stroke="var(--terra)"
            />
            <text
              x="12"
              y="20"
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="var(--terra)"
            >
              ?
            </text>
          </>
        )}
      </svg>
      <span className="text-[10px] font-semibold tabular-nums text-(--ink)">{count}</span>
    </span>
  );
}
