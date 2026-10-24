import type { GameState, Outcome, PlayerOutcome } from "../types";
import { archetypeById, type PlayerArchetype } from "../analytics/playerTypes";
import { DEBT_SCORE_PENALTY } from "./balance";

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
  players: PlayerOutcome[];
}

export interface TipRule {
  id: string;
  when(facts: OutcomeFacts): boolean;
  text(facts: OutcomeFacts): string;
  /** 星に近づくための優先度。未指定はIDごとの既定値。 */
  impact?(facts: OutcomeFacts): number;
}

function workPoints(player: PlayerOutcome): number {
  return (
    player.contributed.design.points +
    player.contributed.dev.points +
    player.contributed.test.points
  );
}

function teamWork(facts: OutcomeFacts): number {
  return facts.players.reduce((sum, player) => sum + workPoints(player), 0);
}

function workShare(player: PlayerOutcome, facts: OutcomeFacts): number {
  return workPoints(player) / Math.max(1, teamWork(facts));
}

function leaders(facts: OutcomeFacts): PlayerOutcome[] {
  return [...facts.players].toSorted((a, b) => workPoints(b) - workPoints(a));
}

function typeOf(player: PlayerOutcome): PlayerArchetype {
  return archetypeById(player.archetypeId);
}

function typeCounts(facts: OutcomeFacts): Map<string, number> {
  const counts = new Map<string, number>();
  for (const player of facts.players) {
    const label = typeOf(player).label;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

function teamSupportRate(facts: OutcomeFacts): number {
  const play = facts.state.analytics.actions.play;
  return facts.state.analytics.supportPlays / Math.max(1, play);
}

function totalAction(facts: OutcomeFacts, kind: "pull" | "trash" | "pass"): number {
  return facts.state.analytics.actions[kind];
}

function totalEffectPlays(facts: OutcomeFacts): number {
  return Object.values(facts.state.analytics.players ?? {}).reduce(
    (sum, entry) => sum + entry.effectPlays,
    0,
  );
}

function playerSupportRate(player: PlayerOutcome): number {
  return player.analytics
    ? player.analytics.supportPlays / Math.max(1, player.analytics.actions.play)
    : 0;
}

function supportLeader(facts: OutcomeFacts): PlayerOutcome | null {
  if (facts.players.length === 0) return null;
  const averageSupport =
    facts.players.reduce((sum, player) => sum + (player.analytics?.supportPlays ?? 0), 0) /
    facts.players.length;
  const averagePoints =
    facts.players.reduce((sum, player) => sum + (player.analytics?.supportPoints ?? 0), 0) /
    facts.players.length;
  const candidates = facts.players
    .map((player) => {
      const plays = player.analytics?.supportPlays ?? 0;
      const points = player.analytics?.supportPoints ?? 0;
      const ratio =
        (averageSupport > 0 ? plays / averageSupport : 1) * 0.5 +
        (averagePoints > 0 ? points / averagePoints : 1) * 0.5;
      return { player, ratio };
    })
    .toSorted((a, b) => b.ratio - a.ratio);
  const best = candidates[0];
  return best && best.ratio >= 1.25 && playerSupportRate(best.player) >= 0.5 ? best.player : null;
}

function phaseBias(facts: OutcomeFacts): { label: string; share: number } | null {
  const phases = facts.state.analytics.playByPhase;
  const total = phases.design + phases.dev + phases.test;
  if (total === 0) return null;
  const labels = { design: "設計", dev: "開発", test: "テスト" } as const;
  const entries = (["design", "dev", "test"] as const)
    .map((key) => ({ label: labels[key], share: phases[key] / total }))
    .toSorted((a, b) => b.share - a.share);
  return entries[0] ?? null;
}

function starGap(facts: OutcomeFacts): number {
  return Math.max(0, facts.nextStar - facts.finalScore);
}

function highScoreExpired(facts: OutcomeFacts): number {
  return facts.state.tasks.filter((task) => task.lane === "trash" && task.score >= 4).length;
}

function starPlanText(facts: OutcomeFacts): string {
  const gap = starGap(facts);
  const debt = facts.state.teamDebt;
  const limit = facts.state.rules.debtLimit;
  if (debt >= limit) {
    return `星${facts.stars + 1}へはまず負債を${debt - limit + 1}枚減らす。負債1枚=${DEBT_SCORE_PENALTY}pt。その後あと${gap}pt。`;
  }
  const highTasks = Math.ceil(gap / 7);
  const midTasks = Math.ceil(gap / 3);
  return `星${facts.stars + 1}まであと${gap}pt。負債1枚減らす=+${DEBT_SCORE_PENALTY}pt / スコア6〜7を${highTasks}件 / スコア3を${midTasks}件が目安。`;
}

const TIP_IMPACT: Record<string, number> = {
  praise: 110,
  "debt-limit": 100,
  "star-plan": 90,
  "high-score-expiry": 85,
  "score-role-gap": 58,
  "test-expiry": 75,
  "expiry-rate": 70,
  "high-wip": 65,
  "bottleneck-test": 60,
  "debt-pressure": 55,
  "debt-recovery": 40,
  "over-pull": 50,
  "token-economy": 35,
  "effect-combo": 40,
  hygiene: 35,
  "phase-bias": 25,
  "low-support": 20,
  "solo-carry": 15,
  "support-core": 12,
  "archetype-spread": 8,
  "role-fog": 5,
  "human-type": 4,
};

export const BASE_TIPS: readonly TipRule[] = [
  {
    id: "praise",
    when: (facts) => facts.stars === 3,
    text: (facts) =>
      `星3。完了${facts.completed}件 / 期限切れ${facts.expired}件 / WIP平均${facts.avgWip.toFixed(1)}。`,
  },
  {
    id: "debt-limit",
    when: (facts) => facts.stars !== 3 && facts.state.teamDebt >= facts.state.rules.debtLimit,
    text: (facts) =>
      `負債上限${facts.state.rules.debtLimit}に到達。負債を1枚減らす=+${DEBT_SCORE_PENALTY}pt。まず負債カードの廃棄・シールド・負債除去を優先。`,
  },
  {
    id: "star-plan",
    when: (facts) => facts.stars < 3,
    text: starPlanText,
  },
  {
    id: "high-score-expiry",
    when: (facts) => highScoreExpired(facts) > 0,
    text: (facts) =>
      `高スコア(4以上)の期限切れが${highScoreExpired(facts)}件。次はスコア6〜7を先にPullし、設計→開発→テストの順で余裕を作る。`,
  },
  {
    id: "score-role-gap",
    when: (facts) =>
      facts.stars < 3 && !facts.players.some((player) => player.archetypeId === "score-hunter"),
    text: () =>
      `${archetypeById("score-hunter").label}がいない。星3はスコア6〜7の完了が近道。次のBacklogで高スコアを1件優先する。`,
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
      `期限切れ${facts.expired}件（完了${facts.completed}件）。Backlogの選択と期限管理を見直す。`,
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
  {
    id: "archetype-spread",
    when: (facts) => typeCounts(facts).size >= 3,
    text: (facts) => {
      const entries = [...typeCounts(facts).entries()].toSorted((a, b) => b[1] - a[1]).slice(0, 3);
      return `役割分担: ${entries.map(([label, count]) => `${label}×${count}`).join(" / ")}。`;
    },
  },
  {
    id: "support-core",
    when: (facts) => supportLeader(facts) !== null,
    text: (facts) => {
      const player = supportLeader(facts);
      return player
        ? `${player.name}が支援役。支援${player.analytics?.supportPlays ?? 0}回 / ${player.analytics?.supportPoints ?? 0}pt。次はこの支援をReviewに寄せる。`
        : "支援プレイが機能している。";
    },
  },
  {
    id: "solo-carry",
    when: (facts) => {
      const top = leaders(facts)[0];
      return top !== undefined && workShare(top, facts) >= 0.32;
    },
    text: (facts) => {
      const top = leaders(facts)[0];
      return top
        ? `${top.name}に作業が集中（${Math.round(workShare(top, facts) * 100)}%）。次は支援かPullで分散する。`
        : "作業が1人に集中している。";
    },
  },
  {
    id: "low-support",
    when: (facts) => facts.state.analytics.actions.play >= 10 && teamSupportRate(facts) < 0.3,
    text: (facts) =>
      `支援プレイが${Math.round(teamSupportRate(facts) * 100)}%。他メンバーのReviewや設計を手伝うと流れが速くなる。`,
  },
  {
    id: "token-economy",
    when: (facts) => facts.state.analytics.tokensUsed >= facts.players.length * 3,
    text: (facts) =>
      `LLMトークンを${facts.state.analytics.tokensUsed}回使用。アクションを増やさずに要件を埋めている。`,
  },
  {
    id: "effect-combo",
    when: (facts) => totalEffectPlays(facts) >= facts.players.length * 2,
    text: (facts) =>
      `効果カードを${totalEffectPlays(facts)}回発動。ドロー・追加アクション・負債除去が噛み合っている。`,
  },
  {
    id: "hygiene",
    when: (facts) => totalAction(facts, "trash") >= facts.players.length * 1.5,
    text: (facts) =>
      `廃棄${totalAction(facts, "trash")}回。デッキの平均レベルを上げる動きができている。`,
  },
  {
    id: "over-pull",
    when: (facts) => totalAction(facts, "pull") >= facts.players.length * 5 && facts.avgWip > 3.5,
    text: (facts) =>
      `Pull${totalAction(facts, "pull")}回 / 平均WIP ${facts.avgWip.toFixed(1)}。引きすぎて仕上げが遅れていないか確認。`,
  },
  {
    id: "role-fog",
    when: (facts) => (typeCounts(facts).get("オールラウンダー") ?? 0) >= 2,
    text: (facts) => {
      const balanced = typeCounts(facts).get("オールラウンダー") ?? 0;
      return `オールラウンダーが${balanced}人。役割を1つ決めると、支援・設計・Reviewのどれかが強くなる。`;
    },
  },
  {
    id: "phase-bias",
    when: (facts) => (phaseBias(facts)?.share ?? 0) >= 0.55,
    text: (facts) => {
      const bias = phaseBias(facts);
      return bias
        ? `プレイの${Math.round(bias.share * 100)}%が${bias.label}。他フェーズのカードが余っていないか確認。`
        : "フェーズが偏っている。";
    },
  },
  {
    id: "debt-recovery",
    when: (facts) =>
      facts.state.teamDebt <= Math.floor(facts.state.rules.debtLimit / 2) &&
      Object.values(facts.state.riskStats ?? {}).reduce((sum, stat) => sum + stat.debt, 0) >= 6,
    text: (facts) =>
      `リスク負債を負いながら最終負債${facts.state.teamDebt}。廃棄・負債除去が機能している。`,
  },
  {
    id: "human-type",
    when: (facts) => facts.players.some((player) => player.isHuman),
    text: (facts) => {
      const human = facts.players.find((player) => player.isHuman);
      if (!human) return "あなたのプレイ傾向を確認。";
      return `あなたは「${typeOf(human).label}」。作業シェア${Math.round(workShare(human, facts) * 100)}% / 支援率${Math.round(playerSupportRate(human) * 100)}%。`;
    },
  },
];

export function summarizeTip(facts: OutcomeFacts): string {
  return `完了${facts.completed}件 / 期限切れ${facts.expired}件 / 負債${facts.state.teamDebt}。次の星まであと${Math.max(0, facts.nextStar - facts.finalScore)}点。`;
}

export function impactOfTip(rule: TipRule, facts: OutcomeFacts): number {
  return rule.impact?.(facts) ?? TIP_IMPACT[rule.id] ?? 10;
}
