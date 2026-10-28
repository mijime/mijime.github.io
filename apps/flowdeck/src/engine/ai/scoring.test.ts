import { describe, expect, it } from "vitest";
import { BASE_RULES } from "../rules";
import { createGame } from "../setup";
import type { CardInstance, PersonalityWeights } from "../types";
import { playScore, pullScore, trashScore } from "./scoring";
import type { PlayCandidate } from "./types";

function weights(overrides: Partial<PersonalityWeights> = {}): PersonalityWeights {
  return {
    focus: 0,
    greed: 0,
    urgency: 0,
    prudence: 0,
    solidarity: 0,
    appetite: 0,
    ...overrides,
  };
}

function setup() {
  const state = createGame(1, 10, 4, undefined, 0);
  const player = state.players[1]!;
  const card =
    player.hand.find((entry) => entry.type !== "debt") ??
    ({ id: 999, type: "design", level: 2 } satisfies CardInstance);
  const task = {
    ...state.tasks[0]!,
    kind: "incident" as const,
    requirements: { design: 1, dev: 0, test: 0 },
    attached: [],
  };
  const candidate: PlayCandidate = {
    kind: "play",
    card,
    task,
    support: false,
    type: "design",
    remaining: 1,
    required: 1,
  };
  return { state, player, candidate };
}

describe("personality weights", () => {
  it("prudence はインシデントと負債を優先する", () => {
    const { state, candidate } = setup();
    expect(
      playScore({ ...candidate, support: false }, weights({ prudence: 1 }), BASE_RULES),
    ).toBeGreaterThan(
      playScore({ ...candidate, support: false }, weights({ prudence: -1 }), BASE_RULES),
    );

    const debt = { id: 1000, type: "debt", level: 1 } satisfies CardInstance;
    expect(trashScore(debt, state, weights({ prudence: 1 }))).toBeGreaterThan(
      trashScore(debt, state, weights({ prudence: -1 })),
    );
  });

  it("solidarity は支援を優先し、自走を下げる", () => {
    const { candidate } = setup();
    const supportHigh = playScore(
      { ...candidate, support: true },
      weights({ solidarity: 1 }),
      BASE_RULES,
    );
    const supportLow = playScore(
      { ...candidate, support: true },
      weights({ solidarity: -1 }),
      BASE_RULES,
    );
    expect(supportHigh).toBeGreaterThan(supportLow);

    const ownHigh = playScore(
      { ...candidate, support: false },
      weights({ solidarity: 1 }),
      BASE_RULES,
    );
    const ownLow = playScore(
      { ...candidate, support: false },
      weights({ solidarity: -1 }),
      BASE_RULES,
    );
    expect(ownLow).toBeGreaterThan(ownHigh);
  });

  it("appetite はWIPを抱えるほどPullを優先する", () => {
    const { state, player } = setup();
    const open = state.tasks.find((task) => task.lane === "open");
    expect(open).toBeDefined();
    if (!open) return;
    expect(pullScore(open, state, player, weights({ appetite: 1 }))).toBeGreaterThan(
      pullScore(open, state, player, weights({ appetite: -1 })),
    );
  });
});
