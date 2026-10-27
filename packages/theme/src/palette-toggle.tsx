import { usePalette } from "./use-palette";

const LABELS: Record<string, string> = {
  kaga: "加賀",
  sumi: "墨",
};

export function PaletteToggle() {
  const { palette, setPalette } = usePalette();
  const next = palette === "sumi" ? "kaga" : "sumi";
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
