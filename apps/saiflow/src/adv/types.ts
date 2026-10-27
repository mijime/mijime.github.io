export type SchoolStage = "幼稚園" | "小学校" | "中学校" | "高校" | "大学";

export type SchoolType = "public" | "private" | "skip";

export interface ChildPlan {
  birthAge: number;
  schools: Partial<Record<SchoolStage, SchoolType>>;
}

export interface AdvProfile {
  /** 現在の貯金（万円） */
  savings: number;
  /** 年収（万円） */
  income: number;
  /** 生活費（万円/月） */
  livingMonthly: number;
  /** 現在の家賃（万円/月） */
  rentMonthly: number;
  /** 年金の見込み（万円/月、夫婦合計） */
  pensionMonthly: number;
}

export interface RentHousing {
  type: "rent";
  monthly: number;
}

export interface BuyHousing {
  type: "buy";
  price: number;
  downPayment: number;
  rate: number;
  years: number;
  annualTax: number;
}

export type HousingPlan = RentHousing | BuyHousing;

export interface OneOff {
  age: number;
  name: string;
  /** 正=収入、負=支出（万円） */
  amount: number;
}

export interface AdvFlags {
  housingAsked?: boolean;
  housing?: HousingPlan;
  child1Asked?: boolean;
  child1?: ChildPlan;
  child2Asked?: boolean;
  child2?: ChildPlan;
  investmentAsked?: boolean;
  investmentMonthly?: number;
  investmentStartAge?: number;
  retirementAge?: number;
  carAsked?: boolean;
  car?: { startAge: number; mode: "buy" | "maintain" };
  riskAsked?: boolean;
  risk?: { illness: boolean; care: boolean };
  oneOffs: OneOff[];
}

export function emptyAdvFlags(): AdvFlags {
  return { oneOffs: [] };
}

export type Decision =
  | { kind: "housing" }
  | { kind: "child1" }
  | { kind: "child2" }
  | { kind: "school"; child: 1 | 2; stage: SchoolStage }
  | { kind: "investment" }
  | { kind: "retirement" }
  | { kind: "car" }
  | { kind: "risk" };

export interface PendingDecision {
  age: number;
  decision: Decision;
}
