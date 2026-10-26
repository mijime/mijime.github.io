import type { AiProfile, TeamRules } from "../types";

export const ACTIONS_PER_TURN = 3;
export const HAND_SIZE = 5;
export const TOTAL_DAYS = 10;
export const GAME_LENGTH_OPTIONS = [10, 20, 30, 100] as const;
export type GameLength = (typeof GAME_LENGTH_OPTIONS)[number];
export const DEBT_SCORE_PENALTY = 2;

/**
 * 人数×日数の目標値。
 * ランダム編成の分布を基準に、1星は下位25%、2星は上位25%、3星は上位10%。
 * 目標値はカード追加のたびに再計測する。
 * 100日は200シードの全員ボット計測から設定。
 * 参照は厳密な最適解ではなく、固定した強政策の近似。
 */
const STANDARD_TEAM_RULES_TABLE: Record<number, Record<number, TeamRules>> = {
  4: {
    10: { openTasks: 3, debtLimit: 5, starOne: 24, starTwo: 31, starThree: 35 },
    20: { openTasks: 3, debtLimit: 6, starOne: 58, starTwo: 69, starThree: 72 },
    30: { openTasks: 3, debtLimit: 6, starOne: 95, starTwo: 106, starThree: 112 },
    100: { openTasks: 3, debtLimit: 10, starOne: 372, starTwo: 396, starThree: 406 },
  },
  5: {
    10: { openTasks: 4, debtLimit: 6, starOne: 32, starTwo: 40, starThree: 43 },
    20: { openTasks: 4, debtLimit: 7, starOne: 75, starTwo: 86, starThree: 92 },
    30: { openTasks: 4, debtLimit: 8, starOne: 124, starTwo: 135, starThree: 140 },
    100: { openTasks: 4, debtLimit: 11, starOne: 478, starTwo: 506, starThree: 515 },
  },
  6: {
    10: { openTasks: 4, debtLimit: 8, starOne: 39, starTwo: 48, starThree: 52 },
    20: { openTasks: 4, debtLimit: 9, starOne: 94, starTwo: 105, starThree: 110 },
    30: { openTasks: 4, debtLimit: 10, starOne: 154, starTwo: 164, starThree: 170 },
    100: { openTasks: 4, debtLimit: 13, starOne: 589, starTwo: 615, starThree: 625 },
  },
};

const STRONG_TEAM_RULES_TABLE: Record<number, Record<number, TeamRules>> = {
  4: {
    10: { openTasks: 3, debtLimit: 5, starOne: 25, starTwo: 33, starThree: 36 },
    20: { openTasks: 3, debtLimit: 6, starOne: 62, starTwo: 71, starThree: 76 },
    30: { openTasks: 3, debtLimit: 6, starOne: 101, starTwo: 112, starThree: 116 },
    100: { openTasks: 3, debtLimit: 10, starOne: 394, starTwo: 414, starThree: 424 },
  },
  5: {
    10: { openTasks: 4, debtLimit: 6, starOne: 33, starTwo: 42, starThree: 45 },
    20: { openTasks: 4, debtLimit: 7, starOne: 80, starTwo: 89, starThree: 94 },
    30: { openTasks: 4, debtLimit: 8, starOne: 129, starTwo: 142, starThree: 145 },
    100: { openTasks: 4, debtLimit: 11, starOne: 505, starTwo: 525, starThree: 533 },
  },
  6: {
    10: { openTasks: 4, debtLimit: 8, starOne: 40, starTwo: 49, starThree: 52 },
    20: { openTasks: 4, debtLimit: 9, starOne: 98, starTwo: 109, starThree: 113 },
    30: { openTasks: 4, debtLimit: 10, starOne: 160, starTwo: 171, starThree: 174 },
    100: { openTasks: 4, debtLimit: 13, starOne: 616, starTwo: 634, starThree: 641 },
  },
};

export const TEAM_RULES_TABLE: Record<AiProfile, Record<number, Record<number, TeamRules>>> = {
  standard: STANDARD_TEAM_RULES_TABLE,
  strong: STRONG_TEAM_RULES_TABLE,
};

export function teamRulesFor(
  playerCount: number,
  totalDays = 10,
  profile: AiProfile = "standard",
): TeamRules {
  const byProfile = TEAM_RULES_TABLE[profile] ?? STANDARD_TEAM_RULES_TABLE;
  const byDays = byProfile[playerCount] ?? byProfile[5]!;
  return byDays[totalDays] ?? byDays[10]!;
}

export interface RiskDrawThreshold {
  /** pieces / requirement >= numerator / denominator */
  numerator: number;
  denominator: number;
  draws: number;
}

export interface BalanceRules {
  actionsPerTurn: number;
  handSize: number;
  debtScorePenalty: number;
  totalDays: number;
  /** 設計/開発を互いに lv1 として代用できるか */
  allowSubstitution: boolean;
  /** ゲーム開始時に各プレイヤーが持つLLMトークン */
  startingTokens: number;
  teamRules(playerCount: number, totalDays: number, profile?: AiProfile): TeamRules;
  riskDraws: readonly RiskDrawThreshold[];
}

export const BASE_BALANCE: BalanceRules = {
  actionsPerTurn: ACTIONS_PER_TURN,
  handSize: HAND_SIZE,
  debtScorePenalty: DEBT_SCORE_PENALTY,
  totalDays: TOTAL_DAYS,
  allowSubstitution: false,
  startingTokens: 1,
  teamRules: teamRulesFor,
  riskDraws: [
    { numerator: 1, denominator: 2, draws: 3 },
    { numerator: 3, denominator: 8, draws: 2 },
    { numerator: 1, denominator: 3, draws: 1 },
  ],
};
