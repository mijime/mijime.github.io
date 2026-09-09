// Real-world scale: one grid cell = 455mm (half grid / 1/2間).
// Kept in a DOM-free module so pure floor/ logic can use it in node test env.
export const MM_PER_CELL = 455;

// Anchor: one 910mm-square cell = 0.5 tatami = 0.25 tsubo.
const ANCHOR_MM = 910;

/** Tatami count for a cell count under the given grid (455mm cell = 0.125 tatami). */
export function tatamiForCells(cells: number, mm: number = MM_PER_CELL): number {
  return (cells * mm * mm) / (ANCHOR_MM * ANCHOR_MM * 2);
}

/** Tsubo count for a cell count under the given grid (455mm cell = 1/16 tsubo). */
export function tsuboForCells(cells: number, mm: number = MM_PER_CELL): number {
  return (cells * mm * mm) / (ANCHOR_MM * ANCHOR_MM * 4);
}

/** Physical stability threshold for shear walls: 4 half cells = 1820mm. */
export const SHEAR_STABLE_MIN_MM = 1820;
