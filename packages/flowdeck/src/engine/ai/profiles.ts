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
    hint: "個性重視",
    description: "仕上げ寄り・整理寄りの範囲でランダム。性格のばらつきは残す。",
  },
  {
    value: "strong",
    label: "有能",
    hint: "整理重視",
    description:
      "focus 0.25〜1 / greed -1〜-0.25 / urgency 0.5〜1 の強めのランダム。トークンは+1仕上げに使う。",
  },
];

export const DEFAULT_AI_PROFILE: AiProfile = "strong";

/** 有能はトークンを+1仕上げにだけ使う。 */
export function botOptionsForProfile(profile: AiProfile): BotOptions {
  return { tokenPolicy: profile === "strong" ? "after-finish" : "immediate" };
}
export const AI_PROFILES: readonly AiProfile[] = ["standard", "strong"];

/** モンテカルロで上位だった方向に寄せた範囲。 */
export const STRONG_WEIGHT_RANGES = {
  focus: [0.25, 1],
  greed: [-1, -0.25],
  urgency: [0.5, 1],
} as const;

function between(holder: RngHolder, min: number, max: number): number {
  return Math.round((min + (randInt(holder, 1001) / 1000) * (max - min)) * 100) / 100;
}

/**
 * 標準: 旧来の一様分布より、仕上げ・整理寄りに少しだけ傾ける。
 * 有能: MCで安定して強かった方向の範囲でランダム。
 */
export function rollAiWeights(profile: AiProfile, holder: RngHolder): PersonalityWeights {
  if (profile === "strong") {
    return {
      focus: between(holder, ...STRONG_WEIGHT_RANGES.focus),
      greed: between(holder, ...STRONG_WEIGHT_RANGES.greed),
      urgency: between(holder, ...STRONG_WEIGHT_RANGES.urgency),
    };
  }
  return {
    focus: between(holder, -0.5, 1),
    greed: between(holder, -1, 0.5),
    urgency: between(holder, 0, 1),
  };
}
