import type { GameState, PlayerOutcome, TaskLane } from "../../src/engine/types";
import type { RunResult } from "./runner";
import { mean, rate } from "./stats";

export interface RunRow {
  seed: number;
  scenario: string;
  days: number;
  players: number;
  finalScore: number;
  stars: number;
  failed: boolean;
  teamScore: number;
  debt: number;
  debtPenalty: number;
  incidentPenalty: number;
  completed: number;
  expired: number;
  testExpired: number;
  avgWip: number;
  maxWip: number;
  avgLeadTime: number;
  bottleneck: string;
  riskDebt: number;
  riskDrawn: number;
  play: number;
  pull: number;
  trash: number;
  pass: number;
  support: number;
  substitutions: number;
  tokensUsed: number;
}

export function riskDebtOf(state: GameState): number {
  return Object.values(state.riskStats).reduce((sum, stat) => sum + stat.debt, 0);
}

export function riskDrawnOf(state: GameState): number {
  return Object.values(state.riskStats).reduce((sum, stat) => sum + stat.drawn, 0);
}

export function toRunRow(result: RunResult): RunRow {
  const { state } = result;
  const outcome = state.outcome;
  const maxWip =
    state.metrics.length > 0 ? Math.max(...state.metrics.map((snapshot) => snapshot.wip)) : 0;
  const finalScore = outcome?.finalScore ?? 0;
  const teamScore = outcome?.teamScore ?? state.teamScore;
  const incidentPenalty = outcome?.scorePenalty ?? state.scorePenalty;
  const debtPenalty = outcome
    ? Math.max(0, outcome.teamScore - outcome.scorePenalty - finalScore)
    : 0;
  return {
    seed: result.seed,
    scenario: result.scenario,
    days: result.days,
    players: result.playerCount,
    finalScore,
    stars: outcome?.stars ?? 0,
    failed: outcome?.failed ?? false,
    teamScore,
    debt: state.teamDebt,
    debtPenalty,
    incidentPenalty,
    completed: outcome?.completed ?? 0,
    expired: outcome?.expired ?? 0,
    testExpired: outcome?.testExpired ?? 0,
    avgWip: outcome?.avgWip ?? 0,
    maxWip,
    avgLeadTime: outcome?.avgLeadTime ?? 0,
    bottleneck: outcome?.bottleneck ?? "none",
    riskDebt: riskDebtOf(state),
    riskDrawn: riskDrawnOf(state),
    play: state.analytics.actions.play,
    pull: state.analytics.actions.pull,
    trash: state.analytics.actions.trash,
    pass: state.analytics.actions.pass,
    support: state.analytics.supportPlays,
    substitutions: state.analytics.substitutions,
    tokensUsed: state.analytics.tokensUsed,
  };
}

export function runRows(results: RunResult[]): RunRow[] {
  return results.map(toRunRow);
}

export function starCounts(results: RunResult[]): number[] {
  const counts = [0, 0, 0, 0];
  for (const result of results) {
    const stars = result.state.outcome?.stars ?? 0;
    counts[stars] = (counts[stars] ?? 0) + 1;
  }
  return counts;
}

export function countsBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function tipCategory(tip: string): string {
  if (tip.startsWith("星3")) return "praise";
  if (tip.startsWith("負債上限")) return "debt-limit";
  if (tip.startsWith("星")) return "star-plan";
  if (tip.startsWith("高スコア(4以上)の期限切れ")) return "high-score-expiry";
  if (tip.startsWith("バリューエンジニアがいない")) return "score-role-gap";
  if (tip.startsWith("Reviewでの期限切れ")) return "test-expiry";
  if (tip.startsWith("平均WIP")) return "high-wip";
  if (tip.startsWith("期限切れ")) return "expiry-rate";
  if (tip.startsWith("リスク負債を")) return "debt-recovery";
  if (tip.startsWith("負債")) return "debt-pressure";
  if (tip.startsWith("Reviewがボトルネック")) return "bottleneck";
  if (tip.startsWith("役割分担")) return "archetype-spread";
  if (tip.includes("支援役")) return "support-core";
  if (tip.includes("に作業が集中")) return "solo-carry";
  if (tip.startsWith("支援プレイが")) return "low-support";
  if (tip.startsWith("LLMトークン")) return "token-economy";
  if (tip.startsWith("効果カード")) return "effect-combo";
  if (tip.startsWith("廃棄")) return "hygiene";
  if (tip.startsWith("Pull")) return "over-pull";
  if (tip.startsWith("オールラウンダー")) return "role-fog";
  if (tip.startsWith("プレイの")) return "phase-bias";
  if (tip.startsWith("あなたは")) return "human-type";
  return "summary";
}

export function tipStats(results: RunResult[]): {
  total: number;
  runsWithTip: Map<string, number>;
  star3WithTip: Map<string, number>;
} {
  const runsWithTip = new Map<string, number>();
  const star3WithTip = new Map<string, number>();
  let total = 0;
  for (const result of results) {
    const tips = result.state.outcome?.tips ?? [];
    total += tips.length;
    const seen = new Set<string>();
    for (const tip of tips) {
      const category = tipCategory(tip);
      if (seen.has(category)) continue;
      seen.add(category);
      runsWithTip.set(category, (runsWithTip.get(category) ?? 0) + 1);
      if (result.state.outcome?.stars === 3) {
        star3WithTip.set(category, (star3WithTip.get(category) ?? 0) + 1);
      }
    }
  }
  return { total, runsWithTip, star3WithTip };
}

export function expiredByLane(results: RunResult[]): Record<TaskLane, number> {
  const totals: Record<TaskLane, number> = {
    open: 0,
    inbox: 0,
    wip: 0,
    test: 0,
    done: 0,
    trash: 0,
  };
  for (const result of results) {
    for (const task of result.state.tasks) {
      if (task.lane === "trash" && task.expiredLane) totals[task.expiredLane] += 1;
    }
  }
  return totals;
}

export interface SeatRow {
  seat: number;
  label: string;
  n: number;
  completed: number;
  score: number;
  wip: number;
  design: number;
  dev: number;
  test: number;
  deckTotal: number;
}

export function seatRows(results: RunResult[]): SeatRow[] {
  const rows = new Map<number, SeatRow>();
  for (const result of results) {
    const outcome = result.state.outcome;
    if (!outcome) continue;
    outcome.perPlayer.forEach((player, index) => {
      const entry = rows.get(index) ?? {
        seat: index,
        label: index === 0 ? "あなた" : `AI${index}`,
        n: 0,
        completed: 0,
        score: 0,
        wip: 0,
        design: 0,
        dev: 0,
        test: 0,
        deckTotal: 0,
      };
      entry.n += 1;
      entry.completed += player.completed;
      entry.score += player.score;
      entry.wip += player.avgWip;
      entry.design += player.contributed.design.cards;
      entry.dev += player.contributed.dev.cards;
      entry.test += player.contributed.test.cards;
      entry.deckTotal += player.deck.design + player.deck.dev + player.deck.test;
      rows.set(index, entry);
    });
  }
  return [...rows.values()].toSorted((a, b) => a.seat - b.seat);
}

export interface PlayerSample {
  weights: { focus: number; greed: number; urgency: number };
  score: number;
  completed: number;
  workPoints: number;
  workCards: number;
  avgWip: number;
}

export function playerSamples(results: RunResult[]): PlayerSample[] {
  const samples: PlayerSample[] = [];
  for (const result of results) {
    for (const player of result.state.outcome?.perPlayer ?? []) {
      samples.push({
        weights: { ...player.weights },
        score: player.score,
        completed: player.completed,
        workPoints:
          player.contributed.design.points +
          player.contributed.dev.points +
          player.contributed.test.points,
        workCards:
          player.contributed.design.cards +
          player.contributed.dev.cards +
          player.contributed.test.cards,
        avgWip: player.avgWip,
      });
    }
  }
  return samples;
}

export function playerAverage(rows: SeatRow[], selector: (row: SeatRow) => number): number {
  return mean(rows.filter((row) => row.n > 0).map(selector));
}

export function completionRate(row: RunRow): number {
  return rate(row.completed, Math.max(1, row.completed + row.expired));
}

export function resultPlayer(result: RunResult, index: number): PlayerOutcome | undefined {
  return result.state.outcome?.perPlayer[index];
}
