export type AssetName = string;

export interface AssetOp {
  asset: AssetName;
  op: "+" | "-" | "*";
  value: number;
}

export interface Event {
  name: string;
  startYear: number;
  endYear: number | null;
  ops: AssetOp[];
}

export interface SimulationConfig {
  currentAge: number;
  simulationYears: number;
  initialAssets: { name: AssetName; value: number }[];
  events: Event[];
}

export interface ParseError {
  line: number;
  message: string;
}

export interface YearRow {
  age: number;
  operations: { eventName: string; op: AssetOp }[];
  balances: Record<AssetName, number>;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
}
