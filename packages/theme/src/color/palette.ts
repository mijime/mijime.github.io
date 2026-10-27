/**
 * Theme palette shared by CSS and JS/Canvas/Three.js.
 *
 * Keep these values in sync with `tokens.css`. Components should prefer CSS
 * custom properties; this module is for places that cannot read CSS variables
 * (canvas, WebGL, computed chart colours, etc.).
 */

/** Raw swatches from the Kanazawa infographic. */
export const kagaGoshiki = {
  enji: "#bb5759",
  ai: "#35357d",
  oudo: "#c18a39",
  kusa: "#72814b",
  murasaki: "#895b8a",
} as const;

const light = {
  /* Semantic */
  primary: "#b04e52",
  onPrimary: "#fff8f4",
  secondary: "#35357d",
  onSecondary: "#f7f7ff",
  accent: "#b04e52",
  onAccent: "#fff8f4",
  highlight: "#c18a39",
  onHighlight: "#241a08",
  bg: "#faf8f3",
  surface: "#f3f0e9",
  surfaceRaised: "#ffffff",
  sunken: "#ebe7de",
  fg: "#1c1b20",
  muted: "#6b6872",
  success: "#5a6b3c",
  warning: "#8e6320",
  danger: "#a93b3b",
  info: "#35357d",

  /* Legacy aliases */
  enji: "#b04e52",
  ai: "#35357d",
  oudo: "#c18a39",
  kusa: "#72814b",
  murasaki: "#895b8a",
  paper: "#faf8f3",
  ink: "#1c1b20",
  mid: "#6b6872",

  tones: {
    violet: "#7e5c96",
    blue: "#35357d",
    amber: "#96661d",
    red: "#b04e52",
    green: "#5a6b3c",
    teal: "#3f6e66",
    sky: "#4b6e93",
    indigo: "#474a94",
    orange: "#a65b32",
    lime: "#62722f",
    rose: "#a84c60",
    fuchsia: "#94558c",
    cyan: "#3d7a82",
  },
} as const;

const dark = {
  primary: "#d98d8e",
  onPrimary: "#1a1215",
  secondary: "#9ea0de",
  onSecondary: "#15151f",
  accent: "#d98d8e",
  onAccent: "#1a1215",
  highlight: "#ddb268",
  onHighlight: "#241a08",
  bg: "#15141a",
  surface: "#1d1c23",
  surfaceRaised: "#232229",
  sunken: "#0f0e13",
  fg: "#f2efe8",
  muted: "#a39da8",
  success: "#a3bb7c",
  warning: "#ddb268",
  danger: "#e78383",
  info: "#9ea0de",

  enji: "#d98d8e",
  ai: "#9ea0de",
  oudo: "#ddb268",
  kusa: "#a3bb7c",
  murasaki: "#c4a6d8",
  paper: "#15141a",
  ink: "#f2efe8",
  mid: "#a39da8",

  tones: {
    violet: "#c4a6d8",
    blue: "#a0a3e6",
    amber: "#dcb26a",
    red: "#e09092",
    green: "#acc181",
    teal: "#7fc4b8",
    sky: "#92b8d8",
    indigo: "#a9acf0",
    orange: "#e0a274",
    lime: "#b8c97e",
    rose: "#e49cab",
    fuchsia: "#d6a6d2",
    cyan: "#8ac8ce",
  },
} as const;

export const palette = { light, dark } as const;

export type ThemeMode = keyof typeof palette;
export type Palette = (typeof palette)[ThemeMode];
export type ToneName = keyof Palette["tones"];

export function cssVar(name: ToneName, mode?: ThemeMode): string {
  return mode ? palette[mode].tones[name] : `var(--tone-${name})`;
}
