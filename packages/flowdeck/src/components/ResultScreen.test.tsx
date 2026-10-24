import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GameState, Outcome, PlayerOutcome } from "../engine/types";
import { ResultScreen } from "./ResultScreen";

const player = (overrides: Partial<PlayerOutcome>): PlayerOutcome => ({
  id: "p1",
  name: "あなた",
  isHuman: true,
  weights: { focus: 0, greed: 0, urgency: 0 },
  completed: 3,
  score: 6,
  avgWip: 1,
  contributed: {
    design: { cards: 2, points: 5 },
    dev: { cards: 1, points: 3 },
    test: { cards: 1, points: 2 },
  },
  deck: { design: 1, dev: 1, test: 1, debt: 0 },
  ...overrides,
});

function stateWithOutcome(): GameState {
  const outcome: Outcome = {
    finalScore: 20,
    stars: 1,
    teamScore: 30,
    teamDebt: 5,
    scorePenalty: 0,
    completed: 10,
    failed: false,
    perPlayer: [
      player({}),
      player({
        id: "p2",
        name: "ミナ",
        isHuman: false,
        completed: 2,
        score: 3,
        contributed: {
          design: { cards: 1, points: 3 },
          dev: { cards: 1, points: 2 },
          test: { cards: 0, points: 0 },
        },
      }),
    ],
    avgLeadTime: 3,
    avgWip: 2,
    bottleneck: null,
    expired: 0,
    testExpired: 0,
    tips: [],
  };
  return {
    outcome,
    rules: { openTasks: 4, debtLimit: 12, starOne: 10, starTwo: 20, starThree: 30 },
    totalDays: 10,
    seed: 1,
    log: [],
  } as unknown as GameState;
}

describe("ResultScreen", () => {
  it("あなたの貢献サマリーを表示する", () => {
    render(<ResultScreen state={stateWithOutcome()} dispatch={vi.fn()} />);

    expect(screen.getByText("あなたの貢献")).toBeInTheDocument();
    expect(screen.getByText(/チーム内 1位/)).toBeInTheDocument();
    expect(screen.getByText(/チームの作業の/)).toBeInTheDocument();
    expect(screen.getByText("2.00倍")).toBeInTheDocument();
  });
});
