import { RISK_BY_ID } from "../../data/risks";
import type { DaySnapshot, GameState, PlayerOutcome, TaskLane } from "../types";
import { normalizeAnalytics } from "./state";

export interface ActionSummary {
  play: number;
  pull: number;
  trash: number;
  pass: number;
  total: number;
}

export interface PlayStyleSummary {
  actions: ActionSummary;
  playByPhase: Record<"design" | "dev" | "test", number>;
  supportPlays: number;
  substitutions: number;
  tokensUsed: number;
  supportRate: number;
  substitutionRate: number;
  playsPerTurn: number;
}

export interface FlowSummary {
  completed: number;
  expired: number;
  testExpired: number;
  expiredByLane: Record<TaskLane, number>;
  avgLeadTime: number;
  medianLeadTime: number;
  avgWip: number;
  maxWip: number;
  bottleneck: "inbox" | "wip" | "test" | null;
  bottleneckShare: number;
}

export interface RiskSourceSummary {
  id: string;
  title: string;
  drawn: number;
  absorbed: number;
  unmet: number;
  debt: number;
}

export interface RiskSummary {
  drawn: number;
  absorbed: number;
  unmet: number;
  debt: number;
  absorbedRate: number;
  top: RiskSourceSummary[];
}

export interface ScoreSummary {
  teamScore: number;
  debtPenalty: number;
  incidentPenalty: number;
  finalScore: number;
  stars: number;
  failed: boolean;
  nextStar: number;
  nextStarGap: number;
}

export interface ResultSummary {
  score: ScoreSummary;
  flow: FlowSummary;
  trend: DaySnapshot[];
  risk: RiskSummary;
  style: PlayStyleSummary;
  players: PlayerOutcome[];
  tips: string[];
}

/** セットアップ直後のスナップショットを除き、各日の終了時点だけを残す。 */
export function dailyTrend(metrics: DaySnapshot[]): DaySnapshot[] {
  const byDay = new Map<number, DaySnapshot>();
  for (const snapshot of metrics) byDay.set(snapshot.day, snapshot);
  return [...byDay.values()].toSorted((a, b) => a.day - b.day);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function bottleneckOf(trend: DaySnapshot[]): {
  bottleneck: FlowSummary["bottleneck"];
  share: number;
} {
  const totals = { inbox: 0, wip: 0, test: 0 };
  for (const snapshot of trend) {
    totals.inbox += snapshot.lanes.inbox;
    totals.wip += snapshot.lanes.wip;
    totals.test += snapshot.lanes.test;
  }
  const total = totals.inbox + totals.wip + totals.test;
  if (total === 0) return { bottleneck: null, share: 0 };
  const entries = (["inbox", "wip", "test"] as const).toSorted((a, b) => totals[b] - totals[a]);
  const lane = entries[0] ?? null;
  return lane ? { bottleneck: lane, share: totals[lane] / total } : { bottleneck: null, share: 0 };
}

export function buildResultSummary(state: GameState): ResultSummary {
  const outcome = state.outcome;
  const analytics = normalizeAnalytics(state.analytics);
  const metrics = state.metrics ?? [];
  const tasks = state.tasks ?? [];
  const completed = tasks.filter((task) => task.lane === "done");
  const expired = tasks.filter((task) => task.lane === "trash");
  const leadTimes = completed
    .filter((task) => task.acquiredDay !== null)
    .map((task) => Math.max(1, (task.acquiredDay ?? state.day) - task.revealedDay + 1));
  const expiredByLane: Record<TaskLane, number> = {
    open: 0,
    inbox: 0,
    wip: 0,
    test: 0,
    done: 0,
    trash: 0,
  };
  for (const task of expired) {
    if (task.expiredLane) expiredByLane[task.expiredLane] += 1;
  }

  const wipValues = metrics.map((snapshot) => snapshot.wip);
  const trend = dailyTrend(metrics);
  const { bottleneck, share } = bottleneckOf(trend);

  const riskRows = Object.entries(state.riskStats ?? {}).map(([id, stat]) => ({
    id,
    title: id,
    drawn: stat.drawn,
    absorbed: stat.absorbed,
    unmet: stat.unmet,
    debt: stat.debt,
  }));
  const drawn = riskRows.reduce((sum, row) => sum + row.drawn, 0);
  const absorbed = riskRows.reduce((sum, row) => sum + row.absorbed, 0);
  const unmet = riskRows.reduce((sum, row) => sum + row.unmet, 0);
  const riskDebt = riskRows.reduce((sum, row) => sum + row.debt, 0);
  const riskByTitle = new Map<string, RiskSourceSummary>();
  for (const row of riskRows) {
    const title = RISK_BY_ID[row.id]?.title ?? row.id;
    const entry = riskByTitle.get(title) ?? {
      id: title,
      title,
      drawn: 0,
      absorbed: 0,
      unmet: 0,
      debt: 0,
    };
    entry.drawn += row.drawn;
    entry.absorbed += row.absorbed;
    entry.unmet += row.unmet;
    entry.debt += row.debt;
    riskByTitle.set(title, entry);
  }

  const actions = analytics.actions;
  const playTotal = Math.max(1, actions.play);
  const teamScore = outcome?.teamScore ?? state.teamScore;
  const incidentPenalty = outcome?.scorePenalty ?? state.scorePenalty;
  const finalScore = outcome?.finalScore ?? teamScore - incidentPenalty;
  const debtPenalty = outcome
    ? Math.max(0, outcome.teamScore - outcome.scorePenalty - outcome.finalScore)
    : 0;
  const stars = outcome?.stars ?? 0;
  const nextStar =
    stars === 0 ? state.rules.starOne : stars === 1 ? state.rules.starTwo : state.rules.starThree;

  return {
    score: {
      teamScore,
      debtPenalty,
      incidentPenalty,
      finalScore,
      stars,
      failed: outcome?.failed ?? false,
      nextStar,
      nextStarGap: Math.max(0, nextStar - finalScore),
    },
    flow: {
      completed: completed.length,
      expired: expired.length,
      testExpired: expired.filter((task) => task.expiredLane === "test").length,
      expiredByLane,
      avgLeadTime: average(leadTimes),
      medianLeadTime: median(leadTimes),
      avgWip: average(wipValues),
      maxWip: wipValues.length > 0 ? Math.max(...wipValues) : 0,
      bottleneck,
      bottleneckShare: share,
    },
    trend,
    risk: {
      drawn,
      absorbed,
      unmet,
      debt: riskDebt,
      absorbedRate: drawn > 0 ? absorbed / drawn : 0,
      top: [...riskByTitle.values()]
        .toSorted((a, b) => b.debt - a.debt || b.drawn - a.drawn)
        .slice(0, 5),
    },
    style: {
      actions: {
        ...actions,
        total: actions.play + actions.pull + actions.trash + actions.pass,
      },
      playByPhase: { ...analytics.playByPhase },
      supportPlays: analytics.supportPlays,
      substitutions: analytics.substitutions,
      tokensUsed: analytics.tokensUsed,
      supportRate: analytics.supportPlays / playTotal,
      substitutionRate: analytics.substitutions / playTotal,
      playsPerTurn:
        actions.play /
        Math.max(1, state.totalDays * (state.players?.length ?? outcome?.perPlayer.length ?? 1)),
    },
    players: outcome?.perPlayer ?? [],
    tips: outcome?.tips ?? [],
  };
}
