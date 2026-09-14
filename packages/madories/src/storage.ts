import Dexie, { type EntityTable } from "dexie";
import { v4 as uuidv4 } from "uuid";
import { createBuilding } from "./store";
import type { Building, Plan, SaveData } from "./types";

// ---- IndexedDB (Dexie) persistence ----

export const DB_NAME = "madories";
// Dexie schema version. Bump this (and add .stores()/.upgrade()) when the
// IndexedDB schema itself changes (stores/indexes). App-level data shape
// Drift (old rows, half-baked writes) is handled by sanitizePlan() below,
// So a version bump is NOT needed for those.
export const DB_VERSION = 1;

type PlanRecord = Plan;
interface MetaRecord {
  key: string;
  value: string;
}

const db = new Dexie(DB_NAME) as Dexie & {
  plans: EntityTable<PlanRecord, "id">;
  meta: EntityTable<MetaRecord, "key">;
};

db.version(DB_VERSION).stores({
  plans: "id, updatedAt",
  meta: "key",
});

/**
 * Runs an IndexedDB operation. If it fails (corrupt DB, schema mismatch,
 * aborted upgrade, ...), deletes the whole database and retries once, so a
 * broken local DB can never brick the app boot. Throws only if the retry
 * also fails.
 */
async function withRecovery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await Dexie.delete(DB_NAME);
    return await fn();
  }
}

/** Deletes the local database. The `db` instance re-opens lazily on next use. */
export async function resetDatabase(): Promise<void> {
  await Dexie.delete(DB_NAME);
}

function isValidFloor(floor: unknown): boolean {
  if (typeof floor !== "object" || floor === null) {
    return false;
  }
  const f = floor as Record<string, unknown>;
  if (!Number.isInteger(f["width"]) || !Number.isInteger(f["height"])) {
    return false;
  }
  const width = f["width"] as number;
  const height = f["height"] as number;
  if (width < 1 || height < 1 || width > 200 || height > 200) {
    return false;
  }
  return (
    Array.isArray(f["cells"]) &&
    (f["cells"] as unknown[]).length === width * height &&
    Array.isArray(f["hWalls"]) &&
    (f["hWalls"] as unknown[]).length === width * (height + 1) &&
    Array.isArray(f["vWalls"]) &&
    (f["vWalls"] as unknown[]).length === (width + 1) * height
  );
}

/**
 * Validates a stored plan and repairs what can be repaired (drops broken
 * floors, re-points activeFloorId). Returns null when nothing salvageable
 * remains — callers should drop such plans.
 */
export function sanitizePlan(plan: unknown): Plan | null {
  if (typeof plan !== "object" || plan === null) {
    return null;
  }
  const p = plan as Record<string, unknown>;
  const building = p["building"] as Record<string, unknown> | undefined;
  if (typeof building !== "object" || building === null || !Array.isArray(building["floors"])) {
    return null;
  }
  const floors = (building["floors"] as unknown[])
    .filter((f) => isValidFloor(f))
    .map((f) => {
      const fl = f as Record<string, unknown>;
      fl["originX"] = Number.isInteger(fl["originX"]) ? (fl["originX"] as number) : 0;
      fl["originY"] = Number.isInteger(fl["originY"]) ? (fl["originY"] as number) : 0;
      return fl;
    });
  if (floors.length === 0) {
    return null;
  }
  const floorIds = new Set(floors.map((f) => (f as unknown as { id?: unknown }).id));
  const activeFloorId =
    typeof p["activeFloorId"] === "string" && floorIds.has(p["activeFloorId"])
      ? (p["activeFloorId"] as string)
      : ((floors[0] as unknown as { id?: string }).id ?? "");
  if (!activeFloorId) {
    return null;
  }
  return {
    activeFloorId,
    building: { ...(building as object), floors } as unknown as Building,
    id: typeof p["id"] === "string" ? (p["id"] as string) : uuidv4(),
    name: typeof p["name"] === "string" ? (p["name"] as string) : "プラン",
    updatedAt: typeof p["updatedAt"] === "number" ? (p["updatedAt"] as number) : Date.now(),
  };
}

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
  const arr = await withRecovery(() => db.plans.orderBy("updatedAt").toArray());
  const reversed: Plan[] = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = sanitizePlan(arr[i]);
    if (p) {
      reversed.push(p);
    }
  }
  return reversed;
}

async function putPlan(plan: Plan): Promise<void> {
  await withRecovery(() => db.plans.put(plan));
}

/** Replaces the whole collection atomically, deleting rows no longer in `plans`. */
async function replaceAllPlans(plans: Plan[]): Promise<void> {
  await withRecovery(() =>
    db.transaction("rw", db.plans, async () => {
      const existing = (await db.plans.toCollection().primaryKeys()) as string[];
      const keep = new Set(plans.map((p) => p.id));
      const toDelete = existing.filter((id) => !keep.has(id));
      await db.plans.bulkPut(plans);
      if (toDelete.length > 0) {
        await db.plans.bulkDelete(toDelete);
      }
    }),
  );
}

async function deletePlan(id: string): Promise<void> {
  await withRecovery(() => db.plans.delete(id));
}

async function getActivePlanId(): Promise<string | null> {
  const row = await withRecovery(() => db.meta.get("activePlanId"));
  return row?.value ?? null;
}

async function setActivePlanId(id: string): Promise<void> {
  await withRecovery(() => db.meta.put({ key: "activePlanId", value: id }));
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
    const plan = sanitizePlan({
      building: data.building,
      activeFloorId: data.activeFloorId,
      id: uuidv4(),
      name: "プラン1",
      updatedAt: Date.now(),
    });
    if (!plan) {
      return false;
    }
    await withRecovery(() => db.plans.put(plan));
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
            const plans = data.plans
              .map((p) => sanitizePlan(p))
              .filter((p): p is Plan => p !== null);
            if (plans.length === 0) {
              resolve(null);
              return;
            }
            resolve({ ...data, plans });
            return;
          }
          // Legacy single-building file -> single plan
          if (data.version === 2) {
            const legacy = data as unknown as {
              building: Building;
              activeFloorId: string;
            };
            const plan = sanitizePlan({
              building: legacy.building,
              activeFloorId: legacy.activeFloorId,
              id: uuidv4(),
              name: "インポート",
              updatedAt: Date.now(),
            });
            if (!plan) {
              resolve(null);
              return;
            }
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
