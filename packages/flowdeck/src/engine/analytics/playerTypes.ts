import type { PlayerAnalytics, PlayerOutcome } from "../types";
import { emptyPlayerAnalytics } from "./state";

export type ArchetypeGroup = "ace" | "support" | "starter" | "utility";

export interface PlayerArchetype {
  id: string;
  label: string;
  description: string;
  group: ArchetypeGroup;
}

export const BALANCED_ARCHETYPE: PlayerArchetype = {
  id: "balanced",
  label: "バランス型",
  description: "突出した得意分野はないが、穴も少ない",
  group: "utility",
};

/** 24の専門型 + バランス型 = 25パターン。 */
export const PLAYER_ARCHETYPES: readonly PlayerArchetype[] = [
  { id: "ace", label: "エース型", description: "作業量と完了数でチームを牽引する", group: "ace" },
  {
    id: "finisher",
    label: "フィニッシャー型",
    description: "少ない手数でタスクを仕上げる",
    group: "ace",
  },
  {
    id: "score-hunter",
    label: "スコアハンター型",
    description: "報酬点の高いタスクを引き当てる",
    group: "ace",
  },
  { id: "collector", label: "コレクター型", description: "完了数を着実に積み上げる", group: "ace" },
  {
    id: "design-ace",
    label: "設計エース型",
    description: "設計フェーズで主導権を握る",
    group: "ace",
  },
  { id: "dev-ace", label: "実装エース型", description: "開発フェーズを大量に進める", group: "ace" },
  { id: "test-ace", label: "テストエース型", description: "Reviewを押し切る", group: "ace" },
  {
    id: "supporter",
    label: "サポーター型",
    description: "他人のタスクを広く支援する",
    group: "support",
  },
  {
    id: "test-supporter",
    label: "テストサポーター型",
    description: "テスト支援に偏ってチームを支える",
    group: "support",
  },
  {
    id: "mentor",
    label: "メンター型",
    description: "支援ポイントでチームを底上げする",
    group: "support",
  },
  {
    id: "facilitator",
    label: "ファシリテーター型",
    description: "Pullと支援で流れを作る",
    group: "support",
  },
  {
    id: "starter",
    label: "スターター型",
    description: "タスクを引き出すが仕上げは少ない",
    group: "starter",
  },
  { id: "planner", label: "プランナー型", description: "設計とPullで段取りする", group: "starter" },
  {
    id: "architect",
    label: "アーキテクト型",
    description: "設計枚数が多く、土台を作る",
    group: "starter",
  },
  {
    id: "fullstack",
    label: "フルスタック型",
    description: "3フェーズを均等にこなす",
    group: "starter",
  },
  {
    id: "generalist",
    label: "ジェネラリスト型",
    description: "代用プレイで穴を埋める",
    group: "starter",
  },
  {
    id: "token-user",
    label: "トークン使い型",
    description: "LLMトークンを積極的に使う",
    group: "starter",
  },
  { id: "organizer", label: "整理屋型", description: "廃棄でデッキを整える", group: "utility" },
  {
    id: "debt-cleaner",
    label: "負債クリーナー型",
    description: "負債カードの処理に強い",
    group: "utility",
  },
  {
    id: "quality",
    label: "品質屋型",
    description: "テストと完了のバランスが良い",
    group: "utility",
  },
  {
    id: "firefighter",
    label: "火消し型",
    description: "インシデントを優先的に処理する",
    group: "utility",
  },
  { id: "parallel", label: "並列型", description: "WIPを抱えて広く進める", group: "utility" },
  {
    id: "focused",
    label: "集中職人型",
    description: "WIPを絞って効率よく進める",
    group: "utility",
  },
  {
    id: "combo",
    label: "コンボ型",
    description: "効果カードを多用して盤面を動かす",
    group: "utility",
  },
  BALANCED_ARCHETYPE,
];

export const ARCHETYPE_BY_ID = new Map(PLAYER_ARCHETYPES.map((type) => [type.id, type]));

export function archetypeById(id: string | undefined): PlayerArchetype {
  return (id ? ARCHETYPE_BY_ID.get(id) : undefined) ?? BALANCED_ARCHETYPE;
}

interface Profile {
  player: PlayerOutcome;
  analytics: PlayerAnalytics;
  teamSize: number;
  plays: number;
  activity: number;
  workRatio: number;
  completionRatio: number;
  rewardRatio: number;
  supportRatio: number;
  pullRatio: number;
  trashRatio: number;
  tokenRatio: number;
  incidentRatio: number;
  effectRatio: number;
  designRatio: number;
  devRatio: number;
  testRatio: number;
  supportRate: number;
  pullShare: number;
  trashRate: number;
  tokenRate: number;
  incidentRate: number;
  effectRate: number;
  substitutionRate: number;
  completionRate: number;
  workPerPlay: number;
  avgReward: number;
  phaseShare: { design: number; dev: number; test: number };
  minPhaseShare: number;
  phaseDiversity: number;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]): number {
  return values.length > 0 ? sum(values) / values.length : 0;
}

function ratio(value: number, teamValues: number[]): number {
  const teamAverage = average(teamValues);
  return teamAverage > 0 ? value / teamAverage : 1;
}

function profileOf(player: PlayerOutcome, team: PlayerOutcome[]): Profile {
  const analytics = player.analytics ?? emptyPlayerAnalytics();
  const plays = analytics.actions.play;
  const cards = player.contributed;
  const cardTotal = cards.design.cards + cards.dev.cards + cards.test.cards;
  const phaseCounts =
    analytics.playByPhase.design + analytics.playByPhase.dev + analytics.playByPhase.test;
  const phaseTotal = Math.max(1, phaseCounts > 0 ? phaseCounts : cardTotal);
  const work = cards.design.points + cards.dev.points + cards.test.points;
  const teamWork = team.map(
    (entry) =>
      entry.contributed.design.points +
      entry.contributed.dev.points +
      entry.contributed.test.points,
  );
  const teamCompleted = team.map((entry) => entry.completed);
  const teamReward = team.map((entry) => entry.score);
  const teamPlays = team.map((entry) => entry.analytics?.actions.play ?? 0);
  const teamSupport = team.map((entry) => entry.analytics?.supportPlays ?? 0);
  const teamPull = team.map((entry) => entry.analytics?.actions.pull ?? 0);
  const teamTrash = team.map((entry) => entry.analytics?.actions.trash ?? 0);
  const teamTokens = team.map((entry) => entry.analytics?.tokensUsed ?? 0);
  const teamIncidents = team.map((entry) => entry.analytics?.incidentPlays ?? 0);
  const teamEffects = team.map((entry) => entry.analytics?.effectPlays ?? 0);
  const teamDesign = team.map((entry) => entry.contributed.design.cards);
  const teamDev = team.map((entry) => entry.contributed.dev.cards);
  const teamTest = team.map((entry) => entry.contributed.test.cards);
  const phaseShare = {
    design: cards.design.cards / phaseTotal,
    dev: cards.dev.cards / phaseTotal,
    test: cards.test.cards / phaseTotal,
  };
  const averagePhase = 1 / 3;
  const phaseDiversity =
    1 -
    (Math.abs(phaseShare.design - averagePhase) +
      Math.abs(phaseShare.dev - averagePhase) +
      Math.abs(phaseShare.test - averagePhase)) /
      2;

  return {
    player,
    analytics,
    teamSize: team.length,
    plays,
    activity: ratio(plays, teamPlays),
    workRatio: ratio(work, teamWork),
    completionRatio: ratio(player.completed, teamCompleted),
    rewardRatio: ratio(player.score, teamReward),
    supportRatio: ratio(analytics.supportPlays, teamSupport),
    pullRatio: ratio(analytics.actions.pull, teamPull),
    trashRatio: ratio(analytics.actions.trash, teamTrash),
    tokenRatio: ratio(analytics.tokensUsed, teamTokens),
    incidentRatio: ratio(analytics.incidentPlays, teamIncidents),
    effectRatio: ratio(analytics.effectPlays, teamEffects),
    designRatio: ratio(cards.design.cards, teamDesign),
    devRatio: ratio(cards.dev.cards, teamDev),
    testRatio: ratio(cards.test.cards, teamTest),
    supportRate: analytics.supportPlays / Math.max(1, plays),
    pullShare: analytics.actions.pull / Math.max(1, plays + analytics.actions.pull),
    trashRate: analytics.actions.trash / Math.max(1, plays + analytics.actions.trash),
    tokenRate: analytics.tokensUsed / Math.max(1, plays + analytics.tokensUsed),
    incidentRate: analytics.incidentPlays / Math.max(1, plays),
    effectRate: analytics.effectPlays / Math.max(1, plays),
    substitutionRate: analytics.substitutions / Math.max(1, plays),
    completionRate: player.completed / Math.max(1, plays),
    workPerPlay: work / Math.max(1, plays),
    avgReward: player.score / Math.max(1, player.completed),
    phaseShare,
    minPhaseShare: Math.min(phaseShare.design, phaseShare.dev, phaseShare.test),
    phaseDiversity,
  };
}

interface Rule {
  type: PlayerArchetype;
  score(profile: Profile): number;
}

const RULES: Rule[] = [
  {
    type: ARCHETYPE_BY_ID.get("ace")!,
    score: (p) =>
      10 * p.workRatio +
      7 * p.completionRatio +
      2 * p.rewardRatio +
      p.activity +
      p.player.completed * 0.4,
  },
  {
    type: ARCHETYPE_BY_ID.get("finisher")!,
    score: (p) =>
      8 * p.completionRatio +
      6 * Math.max(0, 1 - p.player.avgWip / 4) +
      16 * p.completionRate +
      p.player.completed * 0.6,
  },
  {
    type: ARCHETYPE_BY_ID.get("score-hunter")!,
    score: (p) => 8 * p.rewardRatio + 0.4 * p.player.score + 3 * p.avgReward,
  },
  {
    type: ARCHETYPE_BY_ID.get("collector")!,
    score: (p) => 8 * p.completionRatio + 2.5 * p.player.completed + 2 * p.activity,
  },
  {
    type: ARCHETYPE_BY_ID.get("design-ace")!,
    score: (p) => 8 * p.designRatio + 15 * p.phaseShare.design + 4 * p.workRatio,
  },
  {
    type: ARCHETYPE_BY_ID.get("dev-ace")!,
    score: (p) => 8 * p.devRatio + 15 * p.phaseShare.dev + 4 * p.workRatio,
  },
  {
    type: ARCHETYPE_BY_ID.get("test-ace")!,
    score: (p) =>
      8 * p.testRatio + 15 * p.phaseShare.test + 3 * p.workRatio + 3 * p.completionRatio,
  },
  {
    type: ARCHETYPE_BY_ID.get("supporter")!,
    score: (p) =>
      Math.max(0, p.supportRatio - 1) * 18 +
      Math.max(0, p.supportRate - 0.6) * 20 +
      0.1 * p.analytics.supportPoints,
  },
  {
    type: ARCHETYPE_BY_ID.get("test-supporter")!,
    score: (p) => 10 * p.supportRatio + 14 * p.phaseShare.test + 6 * p.testRatio,
  },
  {
    type: ARCHETYPE_BY_ID.get("mentor")!,
    score: (p) =>
      0.25 * p.analytics.supportPoints +
      Math.max(0, p.supportRatio - 1) * 10 +
      Math.max(0, p.supportRate - 0.6) * 8,
  },
  {
    type: ARCHETYPE_BY_ID.get("facilitator")!,
    score: (p) =>
      8 * p.pullRatio + 18 * p.pullShare + Math.max(0, p.supportRatio - 1) * 5 + 2 * p.activity,
  },
  {
    type: ARCHETYPE_BY_ID.get("starter")!,
    score: (p) => 7 * p.pullRatio + 20 * p.pullShare + 4 * (1 - Math.min(1, p.completionRatio)),
  },
  {
    type: ARCHETYPE_BY_ID.get("planner")!,
    score: (p) => 7 * p.pullRatio + 10 * p.phaseShare.design + 4 * p.designRatio,
  },
  {
    type: ARCHETYPE_BY_ID.get("architect")!,
    score: (p) => 12 * p.designRatio + 12 * p.phaseShare.design + 3 * p.workRatio,
  },
  {
    type: ARCHETYPE_BY_ID.get("fullstack")!,
    score: (p) => 75 * p.minPhaseShare + 3 * p.phaseDiversity + 2 * p.activity,
  },
  {
    type: ARCHETYPE_BY_ID.get("generalist")!,
    score: (p) => 55 * p.substitutionRate + 12 * p.phaseDiversity + 2 * p.activity,
  },
  {
    type: ARCHETYPE_BY_ID.get("token-user")!,
    score: (p) => 5 * p.tokenRatio + 45 * p.tokenRate + 2 * p.workRatio,
  },
  {
    type: ARCHETYPE_BY_ID.get("organizer")!,
    score: (p) => 6 * p.trashRatio + 20 * p.trashRate + 0.5 * p.analytics.debtCleaned,
  },
  {
    type: ARCHETYPE_BY_ID.get("debt-cleaner")!,
    score: (p) => 4 * p.analytics.debtCleaned + 1.2 * p.analytics.actions.trash + 6 * p.trashRate,
  },
  {
    type: ARCHETYPE_BY_ID.get("quality")!,
    score: (p) => 18 * p.phaseShare.test + 6 * p.testRatio + 8 * p.completionRatio,
  },
  {
    type: ARCHETYPE_BY_ID.get("firefighter")!,
    score: (p) => 10 * p.incidentRatio + 55 * p.incidentRate,
  },
  {
    type: ARCHETYPE_BY_ID.get("parallel")!,
    score: (p) => 8 * p.player.avgWip + 2 * p.activity - 12 * p.completionRate,
  },
  {
    type: ARCHETYPE_BY_ID.get("focused")!,
    score: (p) =>
      10 * Math.max(0, 1 - p.player.avgWip / 4) +
      1.5 * p.workPerPlay +
      6 * p.workRatio +
      4 * p.completionRatio,
  },
  {
    type: ARCHETYPE_BY_ID.get("combo")!,
    score: (p) => 6 * p.effectRatio + 22 * p.effectRate + 2 * p.workRatio,
  },
];

export interface ArchetypeScore {
  type: PlayerArchetype;
  score: number;
}

export function scorePlayerArchetypes(
  player: PlayerOutcome,
  team: PlayerOutcome[],
): ArchetypeScore[] {
  const profile = profileOf(player, team);
  return RULES.map((rule) => ({ type: rule.type, score: rule.score(profile) })).toSorted(
    (a, b) => b.score - a.score,
  );
}

export function classifyPlayer(player: PlayerOutcome, team: PlayerOutcome[]): PlayerArchetype {
  const profile = profileOf(player, team);
  const scored = scorePlayerArchetypes(player, team);
  let best = BALANCED_ARCHETYPE;
  let bestScore = 0;
  for (const entry of scored) {
    if (entry.score > bestScore) {
      bestScore = entry.score;
      best = entry.type;
    }
  }
  // どの軸も平均的ならバランス型に落とす
  const maxRatio = Math.max(
    profile.workRatio,
    profile.completionRatio,
    profile.rewardRatio,
    profile.supportRatio,
    profile.pullRatio,
    profile.trashRatio,
    profile.tokenRatio,
    profile.incidentRatio,
    profile.effectRatio,
  );
  const phaseSpecialist = Math.max(
    profile.phaseShare.design,
    profile.phaseShare.dev,
    profile.phaseShare.test,
  );
  if (maxRatio < 1.15 && phaseSpecialist < 0.45) {
    return BALANCED_ARCHETYPE;
  }
  return best;
}

export function classifyPlayers(team: PlayerOutcome[]): PlayerOutcome[] {
  return team.map((player) => ({
    ...player,
    archetypeId: classifyPlayer(player, team).id,
  }));
}
