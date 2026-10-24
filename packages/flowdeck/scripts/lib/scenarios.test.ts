import { describe, expect, it } from "vitest";
import { applyOverrides, parseSweep, resolveScenario } from "./scenarios";
import { BASE_RULES } from "../../src/engine/rules";

describe("scenarios", () => {
  it("プリセットを解決する", () => {
    expect(resolveScenario("base").rules.id).toBe("base");
    expect(resolveScenario("no-tokens").rules.balance.startingTokens).toBe(0);
    expect(resolveScenario("substitution").rules.balance.allowSubstitution).toBe(true);
    expect(resolveScenario("fast").rules.balance.actionsPerTurn).toBe(4);
  });

  it("teamRules の上書きが再帰しない", () => {
    const rules = applyOverrides(BASE_RULES, "custom", {
      openTasks: 7,
      debtLimit: 3,
      starOne: 99,
    });
    expect(rules.balance.teamRules(5, 10)).toMatchObject({
      openTasks: 7,
      debtLimit: 3,
      starOne: 99,
      starTwo: 36,
    });
  });

  it("スイープを解析する", () => {
    expect(parseSweep("balance.startingTokens=0,1,2")).toEqual({
      key: "startingTokens",
      values: [0, 1, 2],
    });
    expect(parseSweep("allowSubstitution=true,false").values).toEqual([true, false]);
    expect(parseSweep("generationSwing=0,0.2").values).toEqual([0, 0.2]);
  });

  it("タスクの揺らぎを注入する", () => {
    const stable = resolveScenario("stable");
    const volatile = resolveScenario("volatile");
    expect(stable.rules.generation.swing).toBe(0);
    expect(volatile.rules.generation.swing).toBe(0.2);
  });
});
