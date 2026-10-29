import type { CardEffect, CardEffectKind } from "../../types";
import { actionEffect } from "./action";
import { cycleEffect } from "./cycle";
import { deadlineEffect } from "./deadline";
import { debtCleanEffect } from "./debt-clean";
import { drawEffect } from "./draw";
import { recoverEffect } from "./recover";
import { refreshEffect } from "./refresh";
import { shieldEffect } from "./shield";
import { tokenEffect } from "./token";
import type { CardEffectPlugin, CardEffectRegistry, EffectContext } from "./types";

export type { CardEffectPlugin, CardEffectRegistry, EffectContext } from "./types";

export const CARD_EFFECTS = {
  draw: drawEffect,
  action: actionEffect,
  "debt-clean": debtCleanEffect,
  deadline: deadlineEffect,
  token: tokenEffect,
  shield: shieldEffect,
  cycle: cycleEffect,
  recover: recoverEffect,
  refresh: refreshEffect,
} satisfies CardEffectRegistry;

/**
 * kind と payload の相関は CARD_EFFECTS の satisfies で保証している。
 * 実行時の lookup に伴うキャストはこの1箇所だけに閉じ込める。
 */
function pluginOf(effect: CardEffect): CardEffectPlugin<CardEffectKind> {
  return CARD_EFFECTS[effect.kind] as CardEffectPlugin<CardEffectKind>;
}

export function applyCardEffect(
  registry: CardEffectRegistry,
  ctx: EffectContext,
  effect: CardEffect,
): void {
  if ("amount" in effect && effect.amount <= 0) return;
  (registry[effect.kind] as CardEffectPlugin<CardEffectKind>).apply(ctx, effect);
}

export function effectAiValue(registry: CardEffectRegistry, effect?: CardEffect): number {
  return effect ? (registry[effect.kind] as CardEffectPlugin<CardEffectKind>).aiValue(effect) : 0;
}

export function effectLabel(effect?: CardEffect): string | null {
  return effect ? pluginOf(effect).label(effect) : null;
}

export function effectDescription(effect?: CardEffect): string | null {
  return effect ? pluginOf(effect).describe(effect) : null;
}

export function effectGenerationValue(effect?: CardEffect): number {
  return effect ? pluginOf(effect).generationValue(effect) : 0;
}
