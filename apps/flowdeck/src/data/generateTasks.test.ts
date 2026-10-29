import { describe, expect, it } from "vitest";
import type { GameState, TaskDef } from "../engine/types";
import { AUTO_GENERATION } from "./autoGenerate";
import {
  BUDGET_GENERATION,
  generateTaskDefs,
  taskEfficiency,
  VALUE_GENERATION,
} from "./generateTasks";
import { requirementSwing } from "./generationMath";

function generate(seed: number, policy: typeof BUDGET_GENERATION, totalDays = 10): TaskDef[] {
  const state = { seed, rngState: seed >>> 0, totalDays } as GameState;
  return generateTaskDefs(state, policy);
}

function efficiencies(policy: typeof BUDGET_GENERATION): number[] {
  const values: number[] = [];
  for (let seed = 1; seed <= 50; seed += 1) {
    for (const def of generate(seed, policy)) values.push(taskEfficiency(def));
  }
  return values;
}

describe("task generation", () => {
  it("value生成は効率の外れ値が少ない", () => {
    const values = efficiencies(VALUE_GENERATION);
    expect(Math.min(...values)).toBeGreaterThan(0.24);
    expect(Math.max(...values)).toBeLessThan(0.46);
  });

  it("budget生成は効率の外れ値が出る", () => {
    const values = efficiencies(BUDGET_GENERATION);
    expect(values.some((value) => value > 0.45 || value < 0.25)).toBe(true);
  });

  it("auto生成は日数ごとの枚数・比率・名前ユニーク・効率外れ値なし", () => {
    const expected = {
      10: { total: 30, normal: 10, effect: 16, incident: 3, relic: 1 },
      20: { total: 49, normal: 19, effect: 25, incident: 4, relic: 1 },
      30: { total: 62, normal: 24, effect: 31, incident: 5, relic: 2 },
      100: { total: 76, normal: 28, effect: 38, incident: 6, relic: 4 },
    } as const;

    for (const [days, counts] of Object.entries(expected)) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const defs = generate(seed, AUTO_GENERATION, Number(days));
        expect(defs).toHaveLength(counts.total);
        expect(defs.filter((def) => def.kind === "normal" && !def.reward?.effect)).toHaveLength(
          counts.normal,
        );
        expect(defs.filter((def) => def.reward?.effect)).toHaveLength(counts.effect);
        expect(defs.filter((def) => def.kind === "incident")).toHaveLength(counts.incident);
        expect(defs.filter((def) => def.kind === "relic")).toHaveLength(counts.relic);
        expect(new Set(defs.map((def) => def.title)).size).toBe(counts.total);
        for (const def of defs) {
          expect(def.theme).toBeTruthy();
          const efficiency = taskEfficiency(def);
          if (def.kind === "relic") {
            // ボスは意図的に要求が重い
            expect(efficiency).toBeGreaterThanOrEqual(0.05);
            expect(efficiency).toBeLessThanOrEqual(0.2);
          } else {
            expect(efficiency).toBeGreaterThanOrEqual(0.24);
            expect(efficiency).toBeLessThanOrEqual(0.46);
          }
        }
      }
    }
  });

  it("generationSwingで得損の幅を注入できる", () => {
    const stable = generate(42, { ...AUTO_GENERATION, swing: 0 });
    const volatile = generate(42, { ...AUTO_GENERATION, swing: 0.2 });
    const normalEfficiencies = (defs: TaskDef[]) =>
      defs.filter((def) => def.kind !== "relic").map(taskEfficiency);
    const stableValues = normalEfficiencies(stable);
    const volatileValues = normalEfficiencies(volatile);
    const stableRange = {
      min: Math.min(...stableValues),
      max: Math.max(...stableValues),
    };
    const volatileRange = {
      min: Math.min(...volatileValues),
      max: Math.max(...volatileValues),
    };
    expect(stable).not.toEqual(volatile);
    expect(volatileRange.max - volatileRange.min).toBeGreaterThan(
      stableRange.max - stableRange.min,
    );
    expect(volatileRange.min).toBeGreaterThan(0.2);
    expect(volatileRange.max).toBeLessThan(0.6);
  });

  it("swingは通常タスク±20%・effect/incident±10%に収まる", () => {
    const normal = {
      kind: "normal",
      reward: { type: "dev", level: 3 },
      score: 3,
    } as unknown as TaskDef;
    const effect = {
      kind: "normal",
      reward: { type: "dev", level: 3, effect: { kind: "draw", amount: 1 } },
      score: 1,
    } as unknown as TaskDef;
    expect(requirementSwing(normal, 0.2, 0)).toBeCloseTo(-0.2);
    expect(requirementSwing(normal, 0.2, 9)).toBeCloseTo(0.2);
    expect(requirementSwing(effect, 0.2, 0)).toBeCloseTo(-0.1);
    expect(requirementSwing(effect, 0.2, 9)).toBeCloseTo(0.1);
    expect(requirementSwing(normal, 0.2, 5)).toBe(0);
  });
});
