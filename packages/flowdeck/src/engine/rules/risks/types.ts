import type { Phase } from "../lanes";
import type { RiskEffect, RiskEffectKind } from "../../types";

export interface RiskResolution {
  requirement?: { phase: Phase; amount: number };
  wildcard?: number;
  token?: number;
  tone: "good" | "bad" | "info";
}

export interface RiskPlugin<K extends RiskEffectKind> {
  kind: K;
  resolve(effect: Extract<RiskEffect, { kind: K }>): RiskResolution;
}

export type RiskRegistry = {
  [K in RiskEffectKind]: RiskPlugin<K>;
};
