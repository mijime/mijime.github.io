import { describe, expect, it } from "vitest";
import { createGame } from "./setup";
import { playBotRound } from "./sim/run";

interface Row {
  seed: number;
  finalScore: number;
  stars: number;
  completed: number;
  teamDebt: number;
  expired: number;
  testExpired: number;
}

const EXPECTED: Row[] = [
  { seed: 1, finalScore: 49, stars: 3, completed: 17, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 2, finalScore: 32, stars: 0, completed: 17, teamDebt: 5, expired: 0, testExpired: 0 },
  { seed: 3, finalScore: 31, stars: 0, completed: 16, teamDebt: 5, expired: 1, testExpired: 0 },
  { seed: 4, finalScore: 44, stars: 2, completed: 16, teamDebt: 2, expired: 2, testExpired: 1 },
  { seed: 5, finalScore: 43, stars: 2, completed: 19, teamDebt: 1, expired: 0, testExpired: 0 },
  { seed: 6, finalScore: 40, stars: 1, completed: 18, teamDebt: 2, expired: 1, testExpired: 0 },
  { seed: 7, finalScore: 34, stars: 1, completed: 19, teamDebt: 3, expired: 0, testExpired: 0 },
  { seed: 8, finalScore: 34, stars: 1, completed: 18, teamDebt: 4, expired: 0, testExpired: 0 },
  { seed: 9, finalScore: 44, stars: 2, completed: 19, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 10, finalScore: 44, stars: 2, completed: 17, teamDebt: 2, expired: 1, testExpired: 0 },
  { seed: 11, finalScore: 45, stars: 3, completed: 18, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 12, finalScore: 38, stars: 1, completed: 18, teamDebt: 3, expired: 0, testExpired: 0 },
  { seed: 13, finalScore: 37, stars: 1, completed: 17, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 14, finalScore: 35, stars: 1, completed: 19, teamDebt: 5, expired: 0, testExpired: 0 },
  { seed: 15, finalScore: 36, stars: 1, completed: 18, teamDebt: 3, expired: 0, testExpired: 0 },
  { seed: 16, finalScore: 30, stars: 0, completed: 18, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 17, finalScore: 41, stars: 1, completed: 19, teamDebt: 1, expired: 0, testExpired: 0 },
  { seed: 18, finalScore: 46, stars: 3, completed: 18, teamDebt: 2, expired: 1, testExpired: 1 },
  { seed: 19, finalScore: 42, stars: 2, completed: 17, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 20, finalScore: 39, stars: 1, completed: 18, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 21, finalScore: 36, stars: 1, completed: 18, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 22, finalScore: 39, stars: 1, completed: 19, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 23, finalScore: 32, stars: 0, completed: 18, teamDebt: 2, expired: 0, testExpired: 0 },
  { seed: 24, finalScore: 46, stars: 3, completed: 18, teamDebt: 3, expired: 0, testExpired: 0 },
  { seed: 25, finalScore: 39, stars: 1, completed: 17, teamDebt: 3, expired: 1, testExpired: 1 },
  { seed: 26, finalScore: 37, stars: 1, completed: 18, teamDebt: 5, expired: 2, testExpired: 0 },
  { seed: 27, finalScore: 39, stars: 1, completed: 18, teamDebt: 3, expired: 2, testExpired: 0 },
  { seed: 28, finalScore: 35, stars: 1, completed: 19, teamDebt: 3, expired: 1, testExpired: 0 },
  { seed: 29, finalScore: 36, stars: 1, completed: 17, teamDebt: 3, expired: 0, testExpired: 0 },
  { seed: 30, finalScore: 33, stars: 1, completed: 18, teamDebt: 4, expired: 0, testExpired: 0 },
];

function play(seed: number): Row {
  const state = createGame(seed, 10, 4);
  let guard = 0;
  while (state.phase !== "over" && guard < 20) {
    playBotRound(state);
    guard += 1;
  }
  if (!state.outcome) throw new Error(`seed ${seed} did not finish`);
  return {
    seed,
    finalScore: state.outcome.finalScore,
    stars: state.outcome.stars,
    completed: state.outcome.completed,
    teamDebt: state.teamDebt,
    expired: state.outcome.expired,
    testExpired: state.outcome.testExpired,
  };
}

describe("balance regression", () => {
  it("固定シードの結果が変わらない", () => {
    expect(EXPECTED.map((row) => play(row.seed))).toEqual(EXPECTED);
  });
});
