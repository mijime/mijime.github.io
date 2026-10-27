import { describe, expect, it } from "vitest";
import { simulateRisk } from "./risk";
import type { SimulationConfig } from "./types";

const config: SimulationConfig = {
  currentAge: 35,
  simulationYears: 30,
  scenario: {
    name: "test",
    events: [
      {
        name: "給料",
        startAge: 35,
        endAge: 50,
        ops: [{ asset: "現金", op: "+", value: 500 }],
      },
      {
        name: "生活費",
        startAge: 35,
        endAge: null,
        ops: [{ asset: "現金", op: "-", value: 250 }],
      },
      {
        name: "NISA積立",
        startAge: 35,
        endAge: 50,
        ops: [
          { asset: "現金", op: "-", value: 100 },
          { asset: "NISA", op: "+", value: 100 },
        ],
      },
      {
        name: "NISA運用",
        startAge: 35,
        endAge: null,
        ops: [{ asset: "NISA", op: "*", value: 1.03 }],
      },
    ],
  },
};

describe("simulateRisk", () => {
  it("returns ordered percentiles", () => {
    const risk = simulateRisk(config, { trials: 50, seed: 1 });
    expect(risk.trials).toBe(50);
    expect(risk.p10).toBeLessThanOrEqual(risk.p50);
    expect(risk.p50).toBeLessThanOrEqual(risk.p90);
    expect(risk.depletionProbability).toBeGreaterThanOrEqual(0);
    expect(risk.depletionProbability).toBeLessThanOrEqual(1);
  });

  it("detects a plan that depletes assets", () => {
    const risk = simulateRisk(
      {
        currentAge: 60,
        simulationYears: 20,
        scenario: {
          name: "test",
          events: [
            {
              name: "生活費",
              startAge: 60,
              endAge: null,
              ops: [{ asset: "現金", op: "-", value: 300 }],
            },
          ],
        },
      },
      { trials: 10, seed: 2 },
    );
    expect(risk.depletionProbability).toBe(1);
  });

  it("is reproducible with the same seed", () => {
    const first = simulateRisk(config, { trials: 20, seed: 7 });
    const second = simulateRisk(config, { trials: 20, seed: 7 });
    expect(first).toEqual(second);
  });
});
