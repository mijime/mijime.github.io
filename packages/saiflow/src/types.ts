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
}

export interface ParseError {
  line: number;
  message: string;
}

export interface SqlResult {
  scenarios: Scenario[];
  errors: ParseError[];
}

export interface YearRow {
  age: number;
  operations: { eventName: string; op: AssetOp }[];
  balances: Record<AssetName, number>;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
  groupIncome: Record<string, number>;
  groupExpense: Record<string, number>;
}
