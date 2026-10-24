import type { GameState, Outcome } from "../types";

export interface OutcomeFacts {
  state: GameState;
  finalScore: number;
  stars: number;
  completed: number;
  expired: number;
  testExpired: number;
  avgWip: number;
  bottleneck: Outcome["bottleneck"];
  nextStar: number;
  expiryRate: number;
  debtPressure: number;
}

export interface TipRule {
  id: string;
  when(facts: OutcomeFacts): boolean;
  text(facts: OutcomeFacts): string;
}

export const BASE_TIPS: readonly TipRule[] = [
  {
    id: "praise",
    when: (facts) => facts.stars === 3,
    text: (facts) =>
      `3つ星。完了${facts.completed}件 / 期限切れ${facts.expired}件 / WIP平均${facts.avgWip.toFixed(1)}。`,
  },
  {
    id: "debt-limit",
    when: (facts) => facts.stars !== 3 && facts.state.teamDebt >= facts.state.rules.debtLimit,
    text: (facts) =>
      `負債上限${facts.state.rules.debtLimit}に到達。テスト切れ${facts.testExpired}件・期限切れ${facts.expired}件を確認。`,
  },
  {
    id: "score-fail",
    when: (facts) =>
      facts.stars !== 3 &&
      facts.state.teamDebt < facts.state.rules.debtLimit &&
      facts.finalScore < facts.state.rules.starOne,
    text: (facts) =>
      `星1まであと${facts.state.rules.starOne - facts.finalScore}点。完了${facts.completed}件・期限切れ${facts.expired}件。`,
  },
  {
    id: "test-expiry",
    when: (facts) => facts.testExpired > 0,
    text: (facts) =>
      `Reviewでの期限切れが${facts.testExpired}件。テストカードの確保か、仲間へのテスト支援を増やす。`,
  },
  {
    id: "high-wip",
    when: (facts) => facts.avgWip > 4,
    text: (facts) => `平均WIP ${facts.avgWip.toFixed(1)}。Pullを絞って1件ずつ片付ける。`,
  },
  {
    id: "expiry-rate",
    when: (facts) => facts.expiryRate >= 0.4,
    text: (facts) =>
      `期限切れ${facts.expired}件（完了${facts.completed}件）。Backlogの選択と納期管理を見直す。`,
  },
  {
    id: "debt-pressure",
    when: (facts) =>
      facts.debtPressure >= 0.75 && facts.state.teamDebt < facts.state.rules.debtLimit,
    text: (facts) =>
      `負債${facts.state.teamDebt}/${facts.state.rules.debtLimit}。廃棄・シールド・負債除去で余裕を作る。`,
  },
  {
    id: "bottleneck-test",
    when: (facts) => facts.bottleneck === "test" && facts.testExpired === 0,
    text: () => "Reviewがボトルネック。テストカードの投資かテスト支援を厚くする。",
  },
];

export function summarizeTip(facts: OutcomeFacts): string {
  return `完了${facts.completed}件 / 期限切れ${facts.expired}件 / 負債${facts.state.teamDebt}。次の星まであと${Math.max(0, facts.nextStar - facts.finalScore)}点。`;
}
