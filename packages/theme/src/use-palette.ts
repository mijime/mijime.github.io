import { useEffect, useState } from "react";

const STORAGE_KEY = "palette";
const DEFAULT_PALETTE = "kaga";

function getInitialPalette(): string {
  if (typeof document === "undefined") return DEFAULT_PALETTE;
  return (
    localStorage.getItem(STORAGE_KEY) ?? document.documentElement.dataset.palette ?? DEFAULT_PALETTE
  );
}

/**
 * Reads/writes `data-palette` on `<html>` and persists the choice.
 * Import the preset CSS once (see `themes/*.css`), then:
 *
 *   const { palette, setPalette } = usePalette();
 *   setPalette("sumi");
 */
export function usePalette() {
  const [palette, setPaletteState] = useState(getInitialPalette);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem(STORAGE_KEY, palette);

    const observer = new MutationObserver(() => {
      setPaletteState(document.documentElement.dataset.palette ?? DEFAULT_PALETTE);
    });
    observer.observe(document.documentElement, { attributeFilter: ["data-palette"] });
    return () => observer.disconnect();
  }, [palette]);

  return { palette, setPalette: setPaletteState };
}
