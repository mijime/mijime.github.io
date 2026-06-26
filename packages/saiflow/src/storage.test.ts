import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db, saveScenario, loadScenario, listScenarios } from "./storage";

describe("storage", () => {
  beforeEach(async () => {
    await db.scenarios.clear();
  });

  it("saves and loads a scenario", async () => {
    await saveScenario({
      name: "test",
      dslText: "# 初期設定\n現金:1000\n",
      currentAge: 39,
      simulationYears: 50,
    });
    const list = await listScenarios();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("test");

    const loaded = await loadScenario(list[0].id!);
    expect(loaded).not.toBeNull();
    expect(loaded!.dslText).toBe("# 初期設定\n現金:1000\n");
  });

  it("updates existing scenario", async () => {
    await saveScenario({
      name: "test",
      dslText: "old",
      currentAge: 39,
      simulationYears: 50,
    });
    const list = await listScenarios();
    await saveScenario({
      id: list[0].id,
      name: "test",
      dslText: "new",
      currentAge: 39,
      simulationYears: 50,
    });
    const loaded = await loadScenario(list[0].id!);
    expect(loaded!.dslText).toBe("new");
  });

  it("loadScenario returns null for missing id", async () => {
    const loaded = await loadScenario(999);
    expect(loaded).toBeNull();
  });

  it("listScenarios returns empty array when no data", async () => {
    const list = await listScenarios();
    expect(list).toEqual([]);
  });
});
