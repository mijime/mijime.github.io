import Dexie, { type EntityTable } from "dexie";

interface Scenario {
  id?: number;
  name: string;
  dslText: string;
  currentAge: number;
  simulationYears: number;
  updatedAt: Date;
}

const db = new Dexie("saiflow") as Dexie & { scenarios: EntityTable<Scenario> };

db.version(1).stores({
  scenarios: "++id, name, updatedAt",
});

async function saveScenario(opts: {
  id?: number;
  name: string;
  dslText: string;
  currentAge: number;
  simulationYears: number;
}): Promise<void> {
  if (opts.id !== undefined) {
    await db.scenarios.update(opts.id, {
      name: opts.name,
      dslText: opts.dslText,
      currentAge: opts.currentAge,
      simulationYears: opts.simulationYears,
      updatedAt: new Date(),
    });
  } else {
    await db.scenarios.add({
      name: opts.name,
      dslText: opts.dslText,
      currentAge: opts.currentAge,
      simulationYears: opts.simulationYears,
      updatedAt: new Date(),
    });
  }
}

async function loadScenario(id: number): Promise<Scenario | null> {
  const s = await db.scenarios.get(id);
  return s ?? null;
}

async function listScenarios(): Promise<Scenario[]> {
  return db.scenarios.orderBy("updatedAt").reverse().toArray();
}

export { db, saveScenario, loadScenario, listScenarios };
export type { Scenario };
