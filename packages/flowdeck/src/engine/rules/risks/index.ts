import type { RiskEffect, RiskEffectKind } from "../../types";
import { nothingRisk } from "./nothing";
import { requireRisk } from "./require";
import { tokenRisk } from "./token";
import type { RiskPlugin, RiskRegistry, RiskResolution } from "./types";
import { wildcardRisk } from "./wildcard";

export type { RiskPlugin, RiskRegistry, RiskResolution } from "./types";

export const RISK_EFFECTS = {
  require: requireRisk,
  wildcard: wildcardRisk,
  token: tokenRisk,
  nothing: nothingRisk,
} satisfies RiskRegistry;

export function resolveRisk(registry: RiskRegistry, effect: RiskEffect): RiskResolution {
  return (registry[effect.kind] as RiskPlugin<RiskEffectKind>).resolve(effect);
}
