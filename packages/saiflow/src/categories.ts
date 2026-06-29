import type { YearRow } from "./types";

export function categoryName(eventName: string): string {
  return eventName.replaceAll(/\([^)]*\)/g, "").trim();
}

export interface CategoryBreakdown {
  age: number;
  income: Record<string, number>;
  expense: Record<string, number>;
  net: Record<string, number>;
}

export function computeCategories(rows: YearRow[]): {
  allCategories: string[];
  breakdowns: CategoryBreakdown[];
} {
  const catSet = new Set<string>();

  for (const row of rows) {
    for (const { eventName } of row.operations) {
      catSet.add(categoryName(eventName));
    }
  }

  const allCategories = [...catSet].toSorted();

  const breakdowns: CategoryBreakdown[] = rows.map((row) => {
    const income: Record<string, number> = {};
    const expense: Record<string, number> = {};

    for (const { eventName, op } of row.operations) {
      const cat = categoryName(eventName);
      if (op.op === "+") income[cat] = (income[cat] ?? 0) + op.value;
      if (op.op === "-") expense[cat] = (expense[cat] ?? 0) + op.value;
    }

    const net: Record<string, number> = {};
    for (const cat of allCategories) {
      net[cat] = (income[cat] ?? 0) - (expense[cat] ?? 0);
    }

    return { age: row.age, income, expense, net };
  });

  return { allCategories, breakdowns };
}
