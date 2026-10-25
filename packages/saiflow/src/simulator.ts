import type { AssetOp, CashFlow, Event, SimulationConfig, YearRow } from "./types";
import { estimateIncomeTax, hasExplicitTaxEvent, isTaxableIncomeEvent } from "./tax.ts";

export const CASH_ASSET = "現金";
const LIABILITY = /借入|ローン|負債/;
const HOUSE = /住宅|自宅/;

function gkey(g?: string): string {
  return g ?? "(未分類)";
}

export function isCashAsset(asset: string): boolean {
  return asset === CASH_ASSET;
}

interface ActiveEvent {
  event: Event;
  hasCash: boolean;
  hasNonCash: boolean;
}

function classifyOp(active: ActiveEvent, op: AssetOp): CashFlow {
  // Moving money between cash and another asset (savings, investments, loan
  // principal) is a transfer, not income/expense.
  if (active.hasCash && active.hasNonCash) return "transfer";
  if (!isCashAsset(op.asset)) return "none";
  if (op.op === "+") return "income";
  if (op.op === "-") return "expense";
  return "none";
}

export function simulate(config: SimulationConfig): YearRow[] {
  const { currentAge, simulationYears, scenario, autoDrawdown = true } = config;
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
    const active: ActiveEvent[] = scenario.events
      .filter((e) => e.startAge <= age && (e.endAge === null || age <= e.endAge))
      .map((event) => ({
        event,
        hasCash: event.ops.some((op) => isCashAsset(op.asset)),
        hasNonCash: event.ops.some((op) => !isCashAsset(op.asset)),
      }));

    let totalIncome = 0;
    let totalExpense = 0;
    const groupIncome: Record<string, number> = {};
    const groupExpense: Record<string, number> = {};
    const operations: YearRow["operations"] = [];

    for (const activeEvent of active) {
      const { event } = activeEvent;
      for (const op of event.ops) {
        if (op.op !== "+") continue;
        balances[op.asset] = (balances[op.asset] ?? 0) + op.value;
        const flow = classifyOp(activeEvent, op);
        operations.push({ eventName: event.name, op, flow });
        if (flow === "income") {
          totalIncome += op.value;
          const group = gkey(event.group);
          groupIncome[group] = (groupIncome[group] ?? 0) + op.value;
        }
      }
    }

    for (const activeEvent of active) {
      const { event } = activeEvent;
      for (const op of event.ops) {
        if (op.op !== "-") continue;
        balances[op.asset] = (balances[op.asset] ?? 0) - op.value;
        const flow = classifyOp(activeEvent, op);
        operations.push({ eventName: event.name, op, flow });
        if (flow === "expense") {
          totalExpense += op.value;
          const group = gkey(event.group);
          groupExpense[group] = (groupExpense[group] ?? 0) + op.value;
        }
      }
    }

    if (config.estimateTaxes && !hasExplicitTaxEvent(scenario.events.map((event) => event.name))) {
      let taxableGross = 0;
      for (const activeEvent of active) {
        if (!isTaxableIncomeEvent(activeEvent.event.name)) continue;
        for (const op of activeEvent.event.ops) {
          if (op.op === "+" && isCashAsset(op.asset)) taxableGross += op.value;
        }
      }
      const tax = estimateIncomeTax(taxableGross);
      if (tax > 0) {
        balances[CASH_ASSET] = (balances[CASH_ASSET] ?? 0) - tax;
        totalExpense += tax;
        groupExpense["税金"] = (groupExpense["税金"] ?? 0) + tax;
        operations.push({
          eventName: "税金・社会保険",
          op: { asset: CASH_ASSET, op: "-", value: tax },
          flow: "expense",
        });
      }
    }

    if (autoDrawdown) {
      let shortfall = Math.max(0, -(balances[CASH_ASSET] ?? 0));
      if (shortfall > 0) {
        const sellable = Object.keys(balances)
          .filter(
            (asset) =>
              asset !== CASH_ASSET &&
              !LIABILITY.test(asset) &&
              !HOUSE.test(asset) &&
              (balances[asset] ?? 0) > 0 &&
              (!/iDeCo/i.test(asset) || age >= 60),
          )
          .toSorted((a, b) => {
            const priority = (asset: string) =>
              /NISA/i.test(asset) ? 0 : /iDeCo/i.test(asset) ? 2 : 1;
            return priority(a) - priority(b);
          });

        for (const asset of sellable) {
          if (shortfall <= 0) break;
          const amount = Math.min(shortfall, balances[asset] ?? 0);
          if (amount <= 0) continue;
          balances[asset] = (balances[asset] ?? 0) - amount;
          balances[CASH_ASSET] = (balances[CASH_ASSET] ?? 0) + amount;
          shortfall -= amount;
          operations.push(
            {
              eventName: "資産取り崩し",
              op: { asset, op: "-", value: amount },
              flow: "transfer",
            },
            {
              eventName: "資産取り崩し",
              op: { asset: CASH_ASSET, op: "+", value: amount },
              flow: "transfer",
            },
          );
        }
      }
    }

    for (const activeEvent of active) {
      const { event } = activeEvent;
      for (const op of event.ops) {
        if (op.op !== "*") continue;
        const current = balances[op.asset] ?? 0;
        if (current === 0) continue;
        const multiplier = config.returnFactor
          ? config.returnFactor(op.asset, age, op.value)
          : op.value;
        const gain = current * (multiplier - 1);
        balances[op.asset] = current + gain;
        operations.push({
          eventName: event.name,
          op: { ...op, value: multiplier },
          flow: "none",
        });
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
