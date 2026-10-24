export function DicePair({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 24" className={`inline-block ${className}`} aria-hidden="true">
      <g transform="rotate(-8 12 13)">
        <rect
          x="1"
          y="4"
          width="18"
          height="18"
          rx="4"
          fill="var(--paper)"
          stroke="var(--terra)"
          strokeWidth="1.5"
        />
        <circle cx="6" cy="9" r="1.4" fill="var(--terra)" />
        <circle cx="10" cy="13" r="1.4" fill="var(--terra)" />
        <circle cx="14" cy="17" r="1.4" fill="var(--terra)" />
      </g>
      <g transform="rotate(10 24.5 9.5)">
        <rect
          x="17"
          y="1"
          width="15"
          height="15"
          rx="3.5"
          fill="var(--paper)"
          stroke="var(--terra)"
          strokeWidth="1.5"
        />
        <circle cx="21" cy="5" r="1.1" fill="var(--terra)" />
        <circle cx="28" cy="12" r="1.1" fill="var(--terra)" />
      </g>
    </svg>
  );
}
