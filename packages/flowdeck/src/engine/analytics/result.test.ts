import { describe, expect, it } from "vitest";
import { createGame } from "../setup";
import { playBotRound } from "../sim/run";
import { buildResultSummary, dailyTrend } from "./result";

function finishedGame(seed = 42) {
  const state = createGame(seed, 10, 4);
  let guard = 0;
  while (state.phase !== "over" && guard < 20) {
    playBotRound(state);
    guard += 1;
  }
  return state;
}

describe("buildResultSummary", () => {
  it("スコア内訳と最終評価が一致する", () => {
    const state = finishedGame();
    const summary = buildResultSummary(state);
    expect(summary.score.teamScore).toBe(state.outcome?.teamScore);
    expect(summary.score.finalScore).toBe(state.outcome?.finalScore);
    expect(summary.score.debtPenalty).toBeGreaterThanOrEqual(0);
    expect(summary.score.nextStarGap).toBeGreaterThanOrEqual(0);
  });

  it("日次推移は各日1件にまとまる", () => {
    const state = finishedGame();
    const summary = buildResultSummary(state);
    expect(new Set(summary.trend.map((snapshot) => snapshot.day)).size).toBe(summary.trend.length);
    expect(summary.trend.at(-1)?.day).toBe(10);
  });

  it("行動・リスク・フローの傾向を返す", () => {
    const state = finishedGame();
    const summary = buildResultSummary(state);
    expect(summary.style.actions.total).toBeGreaterThan(0);
    expect(summary.style.playByPhase.design).toBeGreaterThan(0);
    expect(summary.risk.drawn).toBeGreaterThan(0);
    expect(summary.flow.completed).toBe(state.outcome?.completed);
    expect(summary.flow.expiredByLane.test).toBeGreaterThanOrEqual(0);
  });
});

describe("dailyTrend", () => {
  it("同じ日の最初のスナップショットを後続で上書きする", () => {
    const trend = dailyTrend([
      {
        day: 1,
        teamScore: 0,
        teamDebt: 0,
        open: 4,
        wip: 0,
        completed: 0,
        lanes: { open: 4, inbox: 0, wip: 0, test: 0, done: 0 },
        perPlayer: [],
      },
      {
        day: 1,
        teamScore: 4,
        teamDebt: 1,
        open: 4,
        wip: 2,
        completed: 1,
        lanes: { open: 4, inbox: 1, wip: 1, test: 0, done: 1 },
        perPlayer: [],
      },
      {
        day: 2,
        teamScore: 8,
        teamDebt: 1,
        open: 4,
        wip: 1,
        completed: 2,
        lanes: { open: 4, inbox: 0, wip: 1, test: 0, done: 2 },
        perPlayer: [],
      },
    ]);
    expect(trend).toHaveLength(2);
    expect(trend[0]?.teamScore).toBe(4);
    expect(trend[1]?.day).toBe(2);
  });
});
