import { describe, expect, it } from "vitest";
import { buildScenarioState } from "./hydrate";

const options = {
  name: "テスト",
  currentAge: 35,
  simulationYears: 10,
  scenarioId: null,
  started: true,
};

describe("buildScenarioState", () => {
  it("builds scenarios and rows from valid DSL", () => {
    const state = buildScenarioState("# A\n,現金,35,35,現金+100\n", options);

    expect(state.scenarios).toHaveLength(1);
    expect(state.scenarios?.[0].name).toBe("A");
    expect(state.rows).toHaveLength(10);
    expect(state.rows?.[0].balances["現金"]).toBe(100);
    expect(state.activeTab).toBe("gui");
    expect(state.scenarioName).toBe("テスト");
  });

  it("opens in the DSL tab without rows when parsing fails", () => {
    const state = buildScenarioState("bad line\n", options);

    expect(state.activeTab).toBe("dsl");
    expect(state.rows).toBeNull();
    expect(state.scenarios).toEqual([]);
    expect(state.parsed && "errors" in state.parsed).toBe(true);
  });

  it("clamps the active scenario index", () => {
    const state = buildScenarioState("# A\n,現金,35,35,現金+100\n\n# B\n,現金,35,35,現金+200\n", {
      ...options,
      activeScenarioIndex: 9,
    });

    expect(state.activeScenarioIndex).toBe(1);
    expect(state.rows?.[0].balances["現金"]).toBe(200);
  });

  it("marks documents loaded from storage as saved", () => {
    const state = buildScenarioState("# A\n,現金,35,35,現金+100\n", {
      ...options,
      fromStorage: true,
    });

    expect(state.saveStatus).toBe("saved");
    expect(state.lastSavedAt).toBeInstanceOf(Date);
  });
});
