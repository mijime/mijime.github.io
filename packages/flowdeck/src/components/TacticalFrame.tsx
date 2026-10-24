export function TacticalFrame() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="tac-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="var(--tac-line)"
            strokeWidth="0.6"
            opacity="0.55"
          />
        </pattern>
        <radialGradient id="tac-glow" cx="50%" cy="0%" r="75%">
          <stop offset="0" stopColor="#2ee6c5" stopOpacity="0.1" />
          <stop offset="1" stopColor="#2ee6c5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tac-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2ee6c5" stopOpacity="0.05" />
          <stop offset="1" stopColor="#2ee6c5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#tac-grid)" />
      <rect width="100%" height="100%" fill="url(#tac-glow)" />
      <rect width="100%" height="35%" fill="url(#tac-scan)" />
    </svg>
  );
}
