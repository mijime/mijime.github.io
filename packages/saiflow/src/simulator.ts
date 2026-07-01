import type { SimulationConfig, YearRow } from "./types";

function gkey(g?: string): string {
  return g ?? "(未分類)";
}

export function simulate(config: SimulationConfig): YearRow[] {
  const { currentAge, simulationYears, scenario } = config;
  const balances: Record<string, number> = {};

  const simStartAge =
    scenario.events.length > 0
      ? Math.min(currentAge, ...scenario.events.map((e) => e.startAge))
      : currentAge;
  const simEndAge = currentAge + simulationYears - 1;
  const totalYears = simEndAge - simStartAge + 1;

  const rows: YearRow[] = [];

  for (let year = 0; year < totalYears; year++) {
    const age = simStartAge + year;
    const active = scenario.events.filter(
      (e) => e.startAge <= age && (e.endAge === null || age <= e.endAge),
    );

    let totalIncome = 0;
    let totalExpense = 0;
    const groupIncome: Record<string, number> = {};
    const groupExpense: Record<string, number> = {};
    const operations: YearRow["operations"] = [];

    for (const e of active) {
      for (const op of e.ops) {
        if (op.op !== "+") continue;
        balances[op.asset] = (balances[op.asset] ?? 0) + op.value;
        operations.push({ eventName: e.name, op });
        totalIncome += op.value;
        const g = gkey(e.group);
        groupIncome[g] = (groupIncome[g] ?? 0) + op.value;
      }
    }

    for (const e of active) {
      for (const op of e.ops) {
        if (op.op !== "-") continue;
        balances[op.asset] = (balances[op.asset] ?? 0) - op.value;
        operations.push({ eventName: e.name, op });
        totalExpense += op.value;
        const g = gkey(e.group);
        groupExpense[g] = (groupExpense[g] ?? 0) + op.value;
      }
    }

    for (const e of active) {
      for (const op of e.ops) {
        if (op.op !== "*") continue;
        const current = balances[op.asset] ?? 0;
        if (current !== 0) {
          const gain = current * (op.value - 1);
          balances[op.asset] = current + gain;
          operations.push({ eventName: e.name, op });
        }
      }
    }

    const totalAssets = Object.values(balances).reduce((a, b) => a + b, 0);

    rows.push({
      age,
      operations,
      balances: { ...balances },
      totalIncome,
      totalExpense,
      totalAssets,
      groupIncome,
      groupExpense,
    });
  }

  return rows;
}
