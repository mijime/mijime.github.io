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

async function saveScenario(opts: {
  id?: number;
  name: string;
  dslText: string;
  currentAge: number;
  simulationYears: number;
}): Promise<number> {
  if (opts.id !== undefined) {
    await db.scenarios.update(opts.id, {
      name: opts.name,
      dslText: opts.dslText,
      currentAge: opts.currentAge,
      simulationYears: opts.simulationYears,
      updatedAt: new Date(),
    });
    return opts.id;
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
}

export { db, saveScenario, loadScenario, listScenarios, deleteScenario };
export type { Scenario };
