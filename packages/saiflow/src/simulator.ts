import type { SimulationConfig, YearRow } from "./types";

export function simulate(config: SimulationConfig): YearRow[] {
  const { currentAge, simulationYears, scenario } = config;
  const balances: Record<string, number> = {};

  const rows: YearRow[] = [];

  for (let year = 0; year < simulationYears; year++) {
    const active = scenario.events.filter(
      (e) =>
        e.startYear <= year &&
        (e.endYear === null || year <= e.endYear),
    );

    let totalIncome = 0;
    let totalExpense = 0;
    const operations: YearRow["operations"] = [];

    for (const e of active) {
      for (const op of e.ops) {
        if (op.op !== "+") continue;
        balances[op.asset] = (balances[op.asset] ?? 0) + op.value;
        operations.push({ eventName: e.name, op });
        totalIncome += op.value;
      }
    }

    for (const e of active) {
      for (const op of e.ops) {
        if (op.op !== "-") continue;
        balances[op.asset] = (balances[op.asset] ?? 0) - op.value;
        operations.push({ eventName: e.name, op });
        totalExpense += op.value;
      }
    }

    for (const e of active) {
      for (const op of e.ops) {
        if (op.op !== "*") continue;
        const current = balances[op.asset] ?? 0;
        if (current > 0) {
          const gain = current * (op.value - 1);
          balances[op.asset] = current + gain;
          operations.push({ eventName: e.name, op });
        }
      }
    }

    const totalAssets = Object.values(balances).reduce((a, b) => a + b, 0);

    rows.push({
      age: currentAge + year,
      operations,
      balances: { ...balances },
      totalIncome,
      totalExpense,
      totalAssets,
    });
  }

  return rows;
}
