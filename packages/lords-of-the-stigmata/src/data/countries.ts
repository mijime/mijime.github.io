import type { CountryDef, CountryKey } from "../types.ts";

export const COUNTRIES: Record<CountryKey, CountryDef> = {
  A: { col: 0x8a6d3b, cap: (n) => n + 1, effect: { track: "mission" } },
  B: { col: 0x3b6e8a, cap: (n) => n, effect: { track: "sacrament" } },
  C: { col: 0xb09a5a, cap: (n) => Math.max(1, n - 1), effect: { track: "sacrifice" } },
  D: { col: 0x5a4a4a, cap: (n) => Math.max(1, n - 1), effect: { track: "wisdom" } },
  E: { col: 0x7a4a8a, cap: () => 1, effect: { vp: 2 } },
  F: { col: 0x6a7a4a, cap: (n) => n + 2, effect: { ac: 1 } },
  G: { col: 0x4a7a6a, cap: (n) => Math.max(1, n - 2), effect: { vp: 1, track: "wisdom" } },
  H: { col: 0x4a6a8a, cap: (n) => n + 1, effect: { track: "mission", apExtra: true } },
  I: { col: 0x7a6a5a, cap: (n) => n, effect: { ac: 2 } },
  J: {
    col: 0x3a8a5a,
    cap: (n) => Math.max(1, n - 1),
    effect: { track: "sacrament", apExtra: true },
  },
  K: { col: 0x8a5a3a, cap: (n) => n, effect: { track: "sacrifice", apExtra: true } },
  L: { col: 0x5a5a9a, cap: (n) => n + 1, effect: { ac: 1, track: "sacrament" } },
  M: { col: 0x9a6a4a, cap: (n) => n, effect: { vp: 1, track: "sacrifice" } },
  N: { col: 0x3a7a9a, cap: (n) => Math.max(1, n - 1), effect: { track: "wisdom", apExtra: true } },
  O: { col: 0x4a3a5a, cap: () => 1, effect: { vp: 2, track: "wisdom" } },
};

export const CKEYS = Object.keys(COUNTRIES);
