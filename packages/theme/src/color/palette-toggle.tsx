import { usePalette } from "./use-palette";

const ORDER = ["kaga", "sumi", "osaka-jade"] as const;

const LABELS: Record<string, string> = {
  kaga: "加賀",
  sumi: "墨",
  "osaka-jade": "翡翠",
};

export function PaletteToggle() {
  const { palette, setPalette } = usePalette();
  const index = ORDER.indexOf(palette as (typeof ORDER)[number]);
  const next = ORDER[(index + 1) % ORDER.length] ?? ORDER[0];
  const label = LABELS[palette] ?? palette;

  return (
    <button
      type="button"
      className="site-theme-toggle"
      onClick={() => setPalette(next)}
      aria-label={`配色: ${label}`}
      title={`配色を${LABELS[next] ?? next}に切り替え`}
    >
      {label}
    </button>
  );
}
