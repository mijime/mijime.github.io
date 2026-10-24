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

function generate(seed: number, policy: typeof BUDGET_GENERATION): TaskDef[] {
  const state = { seed, rngState: seed >>> 0 } as GameState;
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

  it("auto生成は72枚・42/24/6・名前ユニーク・効率外れ値なし", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const defs = generate(seed, AUTO_GENERATION);
      expect(defs).toHaveLength(72);
      expect(defs.filter((def) => def.kind !== "incident" && !def.reward.effect)).toHaveLength(42);
      expect(defs.filter((def) => def.reward.effect)).toHaveLength(24);
      expect(defs.filter((def) => def.kind === "incident")).toHaveLength(6);
      expect(new Set(defs.map((def) => def.title)).size).toBe(72);
      for (const def of defs) {
        expect(def.theme).toBeTruthy();
        const efficiency = taskEfficiency(def);
        expect(efficiency).toBeGreaterThanOrEqual(0.24);
        expect(efficiency).toBeLessThanOrEqual(0.46);
      }
    }
  });

  it("generationSwingで得損の幅を注入できる", () => {
    const stable = generate(42, { ...AUTO_GENERATION, swing: 0 });
    const volatile = generate(42, { ...AUTO_GENERATION, swing: 0.2 });
    const stableRange = {
      min: Math.min(...stable.map(taskEfficiency)),
      max: Math.max(...stable.map(taskEfficiency)),
    };
    const volatileRange = {
      min: Math.min(...volatile.map(taskEfficiency)),
      max: Math.max(...volatile.map(taskEfficiency)),
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
