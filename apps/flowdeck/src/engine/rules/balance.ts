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
export const TEAM_RULES_TABLE: Record<number, Record<number, TeamRules>> = {
  4: {
    10: { openTasks: 3, debtLimit: 5, starOne: 26, starTwo: 38, starThree: 41 },
    20: { openTasks: 3, debtLimit: 4, starOne: 71, starTwo: 87, starThree: 94 },
    30: { openTasks: 3, debtLimit: 5, starOne: 112, starTwo: 136, starThree: 147 },
    100: { openTasks: 3, debtLimit: 4, starOne: 530, starTwo: 673, starThree: 711 },
  },
  5: {
    10: { openTasks: 4, debtLimit: 5, starOne: 35, starTwo: 47, starThree: 52 },
    20: { openTasks: 4, debtLimit: 5, starOne: 94, starTwo: 110, starThree: 118 },
    30: { openTasks: 4, debtLimit: 6, starOne: 152, starTwo: 180, starThree: 195 },
    100: { openTasks: 4, debtLimit: 6, starOne: 777, starTwo: 934, starThree: 969 },
  },
  6: {
    10: { openTasks: 4, debtLimit: 5, starOne: 46, starTwo: 57, starThree: 62 },
    20: { openTasks: 4, debtLimit: 5, starOne: 121, starTwo: 137, starThree: 146 },
    30: { openTasks: 4, debtLimit: 6, starOne: 200, starTwo: 235, starThree: 253 },
    100: { openTasks: 4, debtLimit: 8, starOne: 1048, starTwo: 1187, starThree: 1232 },
  },
};

export function teamRulesFor(
  playerCount: number,
  totalDays = 10,
  _profile: AiProfile = "standard",
): TeamRules {
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
