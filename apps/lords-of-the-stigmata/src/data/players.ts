import { palette } from "@mijime/theme/palette";

const playerColors = [
  palette.dark.tones.blue,
  palette.dark.tones.red,
  palette.dark.tones.green,
  palette.dark.tones.violet,
] as const;

export const PCOLCSS: readonly string[] = playerColors;
export const PCOLORS = playerColors.map((hex) => Number.parseInt(hex.slice(1), 16));
export const PNAMES = ["You", "Azra", "Berith", "Cain"];
