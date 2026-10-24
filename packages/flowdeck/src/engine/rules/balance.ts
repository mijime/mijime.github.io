import type { TeamRules } from "../types";

export const ACTIONS_PER_TURN = 3;
export const HAND_SIZE = 5;
export const TOTAL_DAYS = 10;
export const DEBT_SCORE_PENALTY = 2;

/**
 * 人数×日数の目標値。
 * ランダム編成の分布を基準に、1星は下位25%、2星は上位25%、3星は上位10%。
 * 目標値はカード追加のたびに再計測する。
 * 参照は厳密な最適解ではなく、固定した強政策の近似。
 */
export const TEAM_RULES_TABLE: Record<number, Record<number, TeamRules>> = {
  4: {
    10: { openTasks: 3, debtLimit: 5, starOne: 20, starTwo: 29, starThree: 33 },
    20: { openTasks: 3, debtLimit: 6, starOne: 49, starTwo: 63, starThree: 68 },
    30: { openTasks: 3, debtLimit: 6, starOne: 80, starTwo: 98, starThree: 105 },
  },
  5: {
    10: { openTasks: 4, debtLimit: 6, starOne: 26, starTwo: 36, starThree: 40 },
    20: { openTasks: 4, debtLimit: 7, starOne: 64, starTwo: 78, starThree: 85 },
    30: { openTasks: 4, debtLimit: 8, starOne: 104, starTwo: 124, starThree: 131 },
  },
  6: {
    10: { openTasks: 4, debtLimit: 8, starOne: 33, starTwo: 43, starThree: 47 },
    20: { openTasks: 4, debtLimit: 9, starOne: 80, starTwo: 97, starThree: 103 },
    30: { openTasks: 4, debtLimit: 10, starOne: 132, starTwo: 152, starThree: 160 },
  },
};

export function teamRulesFor(playerCount: number, totalDays = 10): TeamRules {
  const byDays = TEAM_RULES_TABLE[playerCount] ?? TEAM_RULES_TABLE[5]!;
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
  teamRules(playerCount: number, totalDays: number): TeamRules;
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
