import { AUTO_GENERATION } from "./autoGenerate";
import { BUDGET_GENERATION, VALUE_GENERATION } from "./generateTasks";

export const GENERATION_POLICIES = {
  budget: BUDGET_GENERATION,
  value: VALUE_GENERATION,
  auto: AUTO_GENERATION,
} as const;
