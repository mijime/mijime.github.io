export function ActionToken({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 18 18"
      className={`inline-block h-[15px] w-[15px] ${className}`}
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r="7.4"
        fill={filled ? "var(--terra)" : "var(--paper)"}
        stroke={filled ? "var(--terra)" : "var(--ink)"}
        strokeOpacity={filled ? 1 : 0.3}
        strokeWidth="1.4"
      />
      {filled && <circle cx="9" cy="9" r="3" fill="var(--paper)" opacity="0.8" />}
    </svg>
  );
}

export function LlmToken({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`inline-block h-4 w-4 ${className}`} aria-hidden="true">
      <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill="var(--terra)" />
      <circle cx="7.2" cy="9" r="1.3" fill="var(--paper)" />
      <circle cx="12.8" cy="9" r="1.3" fill="var(--paper)" />
      <path d="M6.8 13h6.4" stroke="var(--paper)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function DeadlinePip({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={`inline-block h-2.5 w-2.5 ${className}`} aria-hidden="true">
      <circle
        cx="5"
        cy="5"
        r="3.8"
        fill={filled ? "var(--terra)" : "transparent"}
        stroke={filled ? "var(--terra)" : "var(--ink)"}
        strokeOpacity={filled ? 1 : 0.38}
        strokeWidth="1.2"
      />
    </svg>
  );
}
