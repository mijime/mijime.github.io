import { GENERATION_POLICIES } from "../../src/data/generationPolicies";
import { BASE_BALANCE, type BalanceRules } from "../../src/engine/rules/balance";
import { normalizeGenerationSwing } from "../../src/engine/rules/generation";
import { MAX_GENERATION_SWING } from "../../src/engine/rules/generation";
import { BASE_RULES, RULE_SETS, type RuleSet } from "../../src/engine/rules";

export interface RuleOverride {
  actionsPerTurn?: number;
  handSize?: number;
  debtScorePenalty?: number;
  startingTokens?: number;
  allowSubstitution?: boolean;
  openTasks?: number;
  debtLimit?: number;
  starOne?: number;
  starTwo?: number;
  starThree?: number;
  generation?: keyof typeof GENERATION_POLICIES;
  generationSwing?: number;
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  rules: RuleSet;
}

export const OVERRIDE_KEYS = [
  "actionsPerTurn",
  "handSize",
  "debtScorePenalty",
  "startingTokens",
  "allowSubstitution",
  "openTasks",
  "debtLimit",
  "starOne",
  "starTwo",
  "starThree",
  "generation",
  "generationSwing",
] as const;

export type OverrideKey = (typeof OVERRIDE_KEYS)[number];

function cloneRules(rules: RuleSet, id: string): RuleSet {
  return {
    ...rules,
    id,
    balance: {
      ...rules.balance,
      riskDraws: rules.balance.riskDraws.map((entry) => ({ ...entry })),
    },
    tips: [...rules.tips],
  };
}

export function applyOverrides(base: RuleSet, id: string, overrides: RuleOverride): RuleSet {
  const rules = cloneRules(base, id);
  const originalTeamRules = rules.balance.teamRules;
  const balance: BalanceRules = {
    ...rules.balance,
    actionsPerTurn: overrides.actionsPerTurn ?? rules.balance.actionsPerTurn,
    handSize: overrides.handSize ?? rules.balance.handSize,
    debtScorePenalty: overrides.debtScorePenalty ?? rules.balance.debtScorePenalty,
    startingTokens: overrides.startingTokens ?? rules.balance.startingTokens,
    allowSubstitution: overrides.allowSubstitution ?? rules.balance.allowSubstitution,
    teamRules: (playerCount, totalDays) => {
      const original = originalTeamRules(playerCount, totalDays);
      return {
        openTasks: overrides.openTasks ?? original.openTasks,
        debtLimit: overrides.debtLimit ?? original.debtLimit,
        starOne: overrides.starOne ?? original.starOne,
        starTwo: overrides.starTwo ?? original.starTwo,
        starThree: overrides.starThree ?? original.starThree,
      };
    },
  };
  const generation = overrides.generation
    ? GENERATION_POLICIES[overrides.generation]
    : rules.generation;
  rules.generation =
    overrides.generationSwing === undefined
      ? generation
      : {
          ...generation,
          swing: normalizeGenerationSwing(overrides.generationSwing),
        };
  rules.balance = balance;
  return rules;
}

const PRESETS: Record<string, { label: string; description: string; overrides: RuleOverride }> = {
  base: {
    label: "base",
    description: "現行ルール",
    overrides: {},
  },
  substitution: {
    label: "substitution",
    description: "設計/開発をlv1として相互代用できる",
    overrides: { allowSubstitution: true },
  },
  "no-tokens": {
    label: "no-tokens",
    description: "開始時のLLMトークンなし",
    overrides: { startingTokens: 0 },
  },
  "token-rich": {
    label: "token-rich",
    description: "開始時のLLMトークン2個",
    overrides: { startingTokens: 2 },
  },
  fast: {
    label: "fast",
    description: "1日4アクション",
    overrides: { actionsPerTurn: 4 },
  },
  slow: {
    label: "slow",
    description: "1日2アクション",
    overrides: { actionsPerTurn: 2 },
  },
  "long-hand": {
    label: "long-hand",
    description: "手札6枚",
    overrides: { handSize: 6 },
  },
  "tight-debt": {
    label: "tight-debt",
    description: "負債ペナルティ3点",
    overrides: { debtScorePenalty: 3 },
  },
  "loose-debt": {
    label: "loose-debt",
    description: "負債ペナルティ1点",
    overrides: { debtScorePenalty: 1 },
  },
  budget: {
    label: "budget",
    description: "budget生成ポリシー",
    overrides: { generation: "budget" },
  },
  value: {
    label: "value",
    description: "value生成ポリシー",
    overrides: { generation: "value" },
  },
  stable: {
    label: "stable",
    description: "タスクの得損なし（要求量の揺らぎ0）",
    overrides: { generationSwing: 0 },
  },
  volatile: {
    label: "volatile",
    description: "タスクの得損 ±20%（通常タスクの要求量 0.8〜1.2倍）",
    overrides: { generationSwing: 0.2 },
  },
};

export const SCENARIO_IDS = Object.keys(PRESETS);

export function scenarioIds(): string[] {
  return SCENARIO_IDS;
}

export function resolveScenario(id: string, baseRuleset = "base"): Scenario {
  const base = RULE_SETS[baseRuleset] ?? BASE_RULES;
  const preset = PRESETS[id] ?? PRESETS.base;
  if (!preset) throw new Error(`unknown scenario: ${id}`);
  return {
    id,
    label: preset.label,
    description: preset.description,
    rules: applyOverrides(base, id, preset.overrides),
  };
}

export function allScenarios(baseRuleset = "base"): Scenario[] {
  return SCENARIO_IDS.map((id) => resolveScenario(id, baseRuleset));
}

export function parseOverrideAssignment(
  assignment: string,
): [OverrideKey, string | number | boolean] {
  const separator = assignment.indexOf("=");
  if (separator < 0) throw new Error(`override must be key=value: ${assignment}`);
  const rawKey = assignment
    .slice(0, separator)
    .trim()
    .replace(/^balance\./, "");
  const rawValue = assignment.slice(separator + 1).trim();
  const key = OVERRIDE_KEYS.find((candidate) => candidate === rawKey);
  if (!key) {
    throw new Error(`unknown override: ${rawKey} (allowed: ${OVERRIDE_KEYS.join(", ")})`);
  }
  if (key === "allowSubstitution") {
    if (rawValue !== "true" && rawValue !== "false") {
      throw new Error(`allowSubstitution must be true or false: ${rawValue}`);
    }
    return [key, rawValue === "true"];
  }
  if (key === "generation") {
    if (!(rawValue in GENERATION_POLICIES)) {
      throw new Error(`unknown generation policy: ${rawValue}`);
    }
    return [key, rawValue as keyof typeof GENERATION_POLICIES];
  }
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`override must be a non-negative number: ${assignment}`);
  }
  if (key === "generationSwing" && value > MAX_GENERATION_SWING) {
    throw new Error(`generationSwing must be between 0 and ${MAX_GENERATION_SWING}: ${value}`);
  }
  return [key, value];
}

export function parseSweep(spec: string): {
  key: OverrideKey;
  values: (string | number | boolean)[];
} {
  const separator = spec.indexOf("=");
  if (separator < 0) throw new Error(`sweep must be key=v1,v2,...: ${spec}`);
  const keyPart = spec.slice(0, separator);
  const values = spec
    .slice(separator + 1)
    .split(",")
    .filter((value) => value.length > 0)
    .map((value) => parseOverrideAssignment(`${keyPart}=${value}`)[1]);
  if (values.length === 0) throw new Error(`sweep has no values: ${spec}`);
  return { key: parseOverrideAssignment(`${keyPart}=${values[0]}`)[0], values };
}

export function scenarioFromOverrides(
  id: string,
  overrides: RuleOverride,
  baseRuleset = "base",
): Scenario {
  const base = RULE_SETS[baseRuleset] ?? BASE_RULES;
  return {
    id,
    label: id,
    description: Object.entries(overrides)
      .map(([key, value]) => `${key}=${value}`)
      .join(" "),
    rules: applyOverrides(base, id, overrides),
  };
}

export function baseBalance(): BalanceRules {
  return BASE_BALANCE;
}
