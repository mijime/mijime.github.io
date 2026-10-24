export function BoardTexture() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="fd-felt-dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="var(--felt-dot)" />
          <circle cx="4.5" cy="4.5" r="0.45" fill="var(--felt-dot)" />
        </pattern>
        <linearGradient id="fd-felt-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#fd-felt-dots)" />
      <rect width="100%" height="100%" fill="url(#fd-felt-shade)" />
    </svg>
  );
}
