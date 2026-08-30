import Dexie, { type EntityTable } from "dexie";
import { v4 as uuidv4 } from "uuid";
import { createBuilding } from "./store";
import type { Building, Plan, SaveData } from "./types";

// ---- IndexedDB (Dexie) persistence ----

type PlanRecord = Plan;
interface MetaRecord {
  key: string;
  value: string;
}

const db = new Dexie("madories") as Dexie & {
  plans: EntityTable<PlanRecord, "id">;
  meta: EntityTable<MetaRecord, "key">;
};

db.version(1).stores({
  plans: "id, updatedAt",
  meta: "key",
});

export function createPlan(name: string): Plan {
  const building = createBuilding();
  return {
    building,
    activeFloorId: building.floors[0].id,
    id: uuidv4(),
    name,
    updatedAt: Date.now(),
  };
}

async function listPlans(): Promise<Plan[]> {
  const arr = await db.plans.orderBy("updatedAt").toArray();
  const reversed: Plan[] = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    reversed.push(arr[i]);
  }
  return reversed;
}

async function putPlan(plan: Plan): Promise<void> {
  await db.plans.put(plan);
}

/** Replaces the whole collection atomically, deleting rows no longer in `plans`. */
async function replaceAllPlans(plans: Plan[]): Promise<void> {
  await db.transaction("rw", db.plans, async () => {
    const existing = (await db.plans.toCollection().primaryKeys()) as string[];
    const keep = new Set(plans.map((p) => p.id));
    const toDelete = existing.filter((id) => !keep.has(id));
    await db.plans.bulkPut(plans);
    if (toDelete.length > 0) {
      await db.plans.bulkDelete(toDelete);
    }
  });
}

async function deletePlan(id: string): Promise<void> {
  await db.plans.delete(id);
}

async function getActivePlanId(): Promise<string | null> {
  const row = await db.meta.get("activePlanId");
  return row?.value ?? null;
}

async function setActivePlanId(id: string): Promise<void> {
  await db.meta.put({ key: "activePlanId", value: id });
}

// ---- legacy localStorage migration ----

const LEGACY_KEY = "madories_plan";

/** Migrates the pre-multi-plan localStorage payload into the first IndexedDB plan. */
async function migrateFromLegacy(): Promise<boolean> {
  if (typeof localStorage === "undefined") {
    return false;
  }
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) {
    return false;
  }
  try {
    const data = JSON.parse(raw) as { version?: number; building: Building; activeFloorId: string };
    if (data.version !== 2) {
      return false;
    }
    if ((await db.plans.count()) > 0) {
      return false;
    }
    const plan: Plan = {
      building: data.building,
      activeFloorId: data.activeFloorId,
      id: uuidv4(),
      name: "プラン1",
      updatedAt: Date.now(),
    };
    await db.plans.put(plan);
    return true;
  } catch {
    return false;
  }
}

// ---- file import / export ----

export function saveToFile(plans: Plan[], activePlanId: string): void {
  const data: SaveData = { version: 3, activePlanId, plans };
  const blob = new Blob([JSON.stringify(data, undefined, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "madories.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function loadFromFile(): Promise<SaveData | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as SaveData & {
            version: number;
          };
          if (data.version === 3) {
            resolve(data);
            return;
          }
          // Legacy single-building file -> single plan
          if (data.version === 2) {
            const legacy = data as unknown as {
              building: Building;
              activeFloorId: string;
            };
            const plan: Plan = {
              building: legacy.building,
              activeFloorId: legacy.activeFloorId,
              id: uuidv4(),
              name: "インポート",
              updatedAt: Date.now(),
            };
            resolve({ version: 3, activePlanId: plan.id, plans: [plan] });
            return;
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

export {
  db,
  deletePlan,
  getActivePlanId,
  listPlans,
  migrateFromLegacy,
  putPlan,
  replaceAllPlans,
  setActivePlanId,
};
