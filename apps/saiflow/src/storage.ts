import Dexie, { type EntityTable } from "dexie";

interface Scenario {
  id?: number;
  name: string;
  dslText: string;
  currentAge: number;
  simulationYears: number;
  updatedAt: Date;
}

const db = new Dexie("saiflow") as Dexie & { scenarios: EntityTable<Scenario, "id"> };

db.version(1).stores({
  scenarios: "++id, name, updatedAt",
});

// Ids deleted in this session. A debounced autosave may still be in flight;
// it must not resurrect a document the user just deleted.
const deletedIds = new Set<number>();

async function saveScenario(opts: {
  id?: number;
  name: string;
  dslText: string;
  currentAge: number;
  simulationYears: number;
}): Promise<number> {
  if (opts.id !== undefined) {
    if (deletedIds.has(opts.id)) {
      if (!(await db.scenarios.get(opts.id))) return opts.id;
      deletedIds.delete(opts.id);
    }
    const updated = await db.scenarios.update(opts.id, {
      name: opts.name,
      dslText: opts.dslText,
      currentAge: opts.currentAge,
      simulationYears: opts.simulationYears,
      updatedAt: new Date(),
    });
    if (updated > 0) return opts.id;
    // The record was deleted elsewhere (another tab, storage cleanup, ...).
    // Re-create it instead of silently dropping the user's edits.
  }
  const id = await db.scenarios.add({
    name: opts.name,
    dslText: opts.dslText,
    currentAge: opts.currentAge,
    simulationYears: opts.simulationYears,
    updatedAt: new Date(),
  });
  return id as number;
}

async function loadScenario(id: number): Promise<Scenario | null> {
  const s = await db.scenarios.get(id);
  return s ?? null;
}

async function listScenarios(): Promise<Scenario[]> {
  const arr = await db.scenarios.orderBy("updatedAt").toArray();
  const reversed: Scenario[] = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    reversed.push(arr[i]);
  }
  return reversed;
}

async function deleteScenario(id: number): Promise<void> {
  await db.scenarios.delete(id);
  deletedIds.add(id);
}

export { db, saveScenario, loadScenario, listScenarios, deleteScenario };
export type { Scenario };
