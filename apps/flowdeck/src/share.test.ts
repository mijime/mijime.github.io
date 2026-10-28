import { describe, expect, it } from "vitest";
import { decodeSharedResult, encodeSharedResult, type SharedResult } from "./share";

const sample: SharedResult = {
  v: 1,
  seed: 42,
  totalDays: 10,
  aiProfile: "standard",
  generationSwing: 0.1,
  summary: {
    score: {
      teamScore: 120,
      debtPenalty: 5,
      incidentPenalty: 0,
      finalScore: 115,
      stars: 2,
      failed: false,
      nextStar: 140,
      nextStarGap: 25,
    },
    flow: {
      completed: 8,
      expired: 2,
      testExpired: 1,
      expiredByLane: { open: 0, inbox: 1, wip: 0, test: 1, done: 0, trash: 0 },
      avgLeadTime: 4.2,
      medianLeadTime: 4,
      avgWip: 2.1,
      maxWip: 4,
      bottleneck: "wip",
      bottleneckShare: 0.42,
    },
    trend: [],
    risk: { drawn: 3, absorbed: 2, unmet: 1, debt: 4, absorbedRate: 0.67, top: [] },
    style: {
      actions: { play: 30, pull: 10, trash: 2, pass: 1, total: 43 },
      playByPhase: { design: 10, dev: 12, test: 8 },
      supportPlays: 3,
      substitutions: 1,
      tokensUsed: 2,
      supportRate: 0.1,
      substitutionRate: 0.03,
      playsPerTurn: 2.5,
    },
    players: [
      {
        id: "p1",
        name: "あなた",
        isHuman: true,
        weights: { focus: 1, greed: 1, urgency: 1, prudence: 0, solidarity: 0, appetite: 0 },
        completed: 3,
        score: 50,
        avgWip: 2,
        contributed: {
          design: { cards: 2, points: 6 },
          dev: { cards: 3, points: 9 },
          test: { cards: 1, points: 3 },
        },
        deck: { design: 2, dev: 3, test: 1, debt: 0 },
        archetypeId: "ace",
      },
    ],
    tips: ["テストを厚めにしよう"],
  },
};

describe("shared result codec", () => {
  it("round-trips a result", async () => {
    const code = await encodeSharedResult(sample);
    expect(await decodeSharedResult(code)).toEqual(sample);
  });

  it("rejects malformed codes", async () => {
    expect(await decodeSharedResult("")).toBeNull();
    expect(await decodeSharedResult("x")).toBeNull();
    expect(await decodeSharedResult("gnot-base64")).toBeNull();
  });

  it("rejects a valid encoding with the wrong shape", async () => {
    const code = await encodeSharedResult({ hello: "world" } as unknown as SharedResult);
    expect(await decodeSharedResult(code)).toBeNull();
  });
});
