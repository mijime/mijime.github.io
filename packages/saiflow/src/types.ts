export type AssetName = string;

export interface AssetOp {
  asset: AssetName;
  op: "+" | "-" | "*";
  value: number;
}

export interface Event {
  name: string;
  group?: string;
  startAge: number;
  endAge: number | null;
  ops: AssetOp[];
}

export interface Scenario {
  name: string;
  events: Event[];
}

export interface SimulationConfig {
  currentAge: number;
  simulationYears: number;
  scenario: Scenario;
  /** Cash shortfalls are covered by selling investments (default: true). */
  autoDrawdown?: boolean;
  /** Optional yearly return override for Monte Carlo style simulations. */
  returnFactor?: (asset: string, age: number, base: number) => number;
  /** Estimate income tax and social insurance from salary-like income. */
  estimateTaxes?: boolean;
}

export interface ParseError {
  line: number;
  message: string;
}

export interface SqlResult {
  scenarios: Scenario[];
  errors: ParseError[];
}

/**
 * How an operation affects the household's cash flow.
 * `transfer` is a movement between cash and another asset (savings,
 * investments, loan principal). `none` is a balance-sheet-only change
 * (asset growth, borrowing, ...).
 */
export type CashFlow = "income" | "expense" | "transfer" | "none";

export interface OperationRecord {
  eventName: string;
  op: AssetOp;
  flow: CashFlow;
}

export interface YearRow {
  age: number;
  operations: OperationRecord[];
  balances: Record<AssetName, number>;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  groupIncome: Record<string, number>;
  groupExpense: Record<string, number>;
}
