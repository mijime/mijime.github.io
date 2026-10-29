import { randInt, type RngHolder } from "../rng";
import type { AiProfile, PersonalityWeights } from "../types";
import type { BotOptions } from "./types";

export interface AiProfileOption {
  value: AiProfile;
  label: string;
  hint: string;
  description: string;
}

export const AI_PROFILE_OPTIONS: readonly AiProfileOption[] = [
  {
    value: "standard",
    label: "標準",
    hint: "慎重・低WIP",
    description: "仕上げ・整理・納期に加え、慎重さと低WIPに寄せる。トークンは+1仕上げに使う。",
  },
];

export const DEFAULT_AI_PROFILE: AiProfile = "standard";

/** 標準はトークンを+1仕上げにだけ使う。 */
export function botOptionsForProfile(_profile: AiProfile = DEFAULT_AI_PROFILE): BotOptions {
  return { tokenPolicy: "after-finish" };
}
export const AI_PROFILES: readonly AiProfile[] = ["standard"];

/** モンテカルロで上位だった方向に寄せた範囲。 */
export const AI_WEIGHT_RANGES = {
  focus: [0.25, 1],
  greed: [-1, -0.25],
  urgency: [0.5, 1],
  prudence: [0.2, 0.8],
  solidarity: [-0.2, 0.4],
  appetite: [-0.8, 0.1],
} as const;

function between(holder: RngHolder, min: number, max: number): number {
  return Math.round((min + (randInt(holder, 1001) / 1000) * (max - min)) * 100) / 100;
}

/** 仕上げ・整理・納期に加え、慎重さと低WIPへ寄せた範囲でランダム。 */
export function rollAiWeights(_profile: AiProfile, holder: RngHolder): PersonalityWeights {
  return {
    focus: between(holder, ...AI_WEIGHT_RANGES.focus),
    greed: between(holder, ...AI_WEIGHT_RANGES.greed),
    urgency: between(holder, ...AI_WEIGHT_RANGES.urgency),
    prudence: between(holder, ...AI_WEIGHT_RANGES.prudence),
    solidarity: between(holder, ...AI_WEIGHT_RANGES.solidarity),
    appetite: between(holder, ...AI_WEIGHT_RANGES.appetite),
  };
}
