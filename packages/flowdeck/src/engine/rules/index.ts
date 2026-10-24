import { GENERATION_POLICIES } from "../../data/generationPolicies";
import { BASE_BALANCE } from "./balance";
import { CARD_EFFECTS } from "./effects";
import { TASK_PENALTIES } from "./penalties";
import { BASE_TIPS } from "./tips";
import { RISK_EFFECTS } from "./risks";
import type { RuleSet } from "./types";

export type { RuleSet } from "./types";

export const BASE_RULES: RuleSet = {
  id: "base",
  effects: CARD_EFFECTS,
  penalties: TASK_PENALTIES,
  risks: RISK_EFFECTS,
  generation: GENERATION_POLICIES.auto,
  tips: BASE_TIPS,
  balance: BASE_BALANCE,
};

export const RULE_SETS: Record<string, RuleSet> = {
  base: BASE_RULES,
};

export function resolveRules(id: string | undefined): RuleSet {
  return (id ? RULE_SETS[id] : undefined) ?? BASE_RULES;
}
