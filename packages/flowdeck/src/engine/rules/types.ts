import type { BalanceRules } from "./balance";
import type { CardEffectRegistry } from "./effects/types";
import type { TaskGenerationPolicy } from "./generation";
import type { TaskPenaltyRegistry } from "./penalties/types";
import type { TipRule } from "./tips";
import type { RiskRegistry } from "./risks/types";

export interface RuleSet {
  id: string;
  effects: CardEffectRegistry;
  penalties: TaskPenaltyRegistry;
  risks: RiskRegistry;
  generation: TaskGenerationPolicy;
  tips: readonly TipRule[];
  balance: BalanceRules;
}
