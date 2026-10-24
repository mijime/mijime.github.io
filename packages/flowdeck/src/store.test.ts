import { describe, expect, it } from "vitest";
import { createGame } from "./engine/setup";
import { normalizeState } from "./store";

describe("normalizeState", () => {
  it("v26セーブに analytics と lanes を補う", () => {
    const state = createGame(1, 10, 4);
    const legacy = state as unknown as Record<string, unknown>;
    legacy.version = 26;
    delete legacy.analytics;
    delete legacy.generationSwing;
    legacy.metrics = [
      {
        day: 1,
        teamScore: 0,
        teamDebt: 0,
        open: 4,
        wip: 0,
        completed: 0,
        perPlayer: [],
      },
    ];

    const normalized = normalizeState(legacy as unknown as typeof state);
    expect(normalized.version).toBe(27);
    expect(normalized.generationSwing).toBe(0.1);
    expect(normalized.analytics.actions.play).toBe(0);
    expect(normalized.metrics[0]?.lanes).toEqual({
      open: 0,
      inbox: 0,
      wip: 0,
      test: 0,
      done: 0,
    });
  });
});
