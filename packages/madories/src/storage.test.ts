import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  createPlan,
  db,
  deletePlan,
  getActivePlanId,
  listPlans,
  migrateFromLegacy,
  putPlan,
  replaceAllPlans,
  setActivePlanId,
} from "./storage";
import type { Plan } from "./types";

function makePlan(name: string, updatedAt: number): Plan {
  const plan = createPlan(name);
  return { ...plan, updatedAt };
}

beforeEach(async () => {
  await db.plans.clear();
  await db.meta.clear();
});

describe("plans CRUD", () => {
  it("creates a plan with an empty default building", () => {
    const plan = createPlan("プランA");
    expect(plan.name).toBe("プランA");
    expect(plan.building.cellSize).toBe(32);
    expect(plan.building.floors).toHaveLength(1);
    expect(plan.activeFloorId).toBe(plan.building.floors[0].id);
    expect(plan.id).toBeTruthy();
  });

  it("round-trips a plan via putPlan / listPlans", async () => {
    const plan = makePlan("test", 1000);
    await putPlan(plan);
    const list = await listPlans();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(plan.id);
    expect(list[0].name).toBe("test");
    expect(list[0].building.floors[0].id).toBe(plan.building.floors[0].id);
  });

  it("lists plans in reverse updated order", async () => {
    await putPlan(makePlan("old", 100));
    await putPlan(makePlan("mid", 200));
    await putPlan(makePlan("new", 300));
    const list = await listPlans();
    expect(list.map((p) => p.name)).toEqual(["new", "mid", "old"]);
  });

  it("updates an existing plan in place", async () => {
    const plan = makePlan("test", 1000);
    await putPlan(plan);
    await putPlan({ ...plan, name: "renamed", updatedAt: 2000 });
    const list = await listPlans();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("renamed");
  });

  it("persists many plans and deletes one", async () => {
    const a = makePlan("a", 100);
    const b = makePlan("b", 200);
    await putPlan(a);
    await putPlan(b);
    expect(await listPlans()).toHaveLength(2);

    await deletePlan(a.id);
    const list = await listPlans();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });

  it("replaceAllPlans swaps the collection and drops missing rows", async () => {
    await putPlan(makePlan("a", 100));
    await putPlan(makePlan("b", 200));
    const c = makePlan("c", 300);
    await replaceAllPlans([c]);

    const list = await listPlans();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(c.id);
    expect(list[0].name).toBe("c");
  });
});

describe("active plan id", () => {
  it("returns null when unset", async () => {
    expect(await getActivePlanId()).toBeNull();
  });

  it("round-trips an active plan id", async () => {
    await setActivePlanId("p1");
    expect(await getActivePlanId()).toBe("p1");
    await setActivePlanId("p2");
    expect(await getActivePlanId()).toBe("p2");
  });
});

describe("legacy localStorage migration", () => {
  const store: Record<string, string> = {};

  function useLocalStorage() {
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    };
  }

  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  });

  it("migrates a v2 single-building payload into the first plan", async () => {
    const plan = createPlan("src");
    useLocalStorage();
    store["madories_plan"] = JSON.stringify({
      version: 2,
      building: plan.building,
      activeFloorId: plan.activeFloorId,
    });

    const migrated = await migrateFromLegacy();
    expect(migrated).toBe(true);

    const list = await listPlans();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("プラン1");
    expect(list[0].building.floors[0].id).toBe(plan.building.floors[0].id);
    expect(list[0].activeFloorId).toBe(plan.activeFloorId);
  });

  it("does not migrate when plans already exist", async () => {
    await putPlan(makePlan("existing", 100));
    useLocalStorage();
    store["madories_plan"] = JSON.stringify({ version: 2, building: {}, activeFloorId: "" });

    await expect(migrateFromLegacy()).resolves.toBe(false);
    expect(await listPlans()).toHaveLength(1);
  });

  it("returns false when no legacy payload exists", async () => {
    useLocalStorage();
    expect(await migrateFromLegacy()).toBe(false);
  });

  it("returns false on corrupt legacy payload", async () => {
    useLocalStorage();
    store["madories_plan"] = "not-json{{";
    await expect(migrateFromLegacy()).resolves.toBe(false);
  });
});
