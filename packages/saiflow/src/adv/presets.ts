import type { AdvProfile, SchoolStage } from "./types";

export const SCHOOL_STAGES: SchoolStage[] = ["幼稚園", "小学校", "中学校", "高校", "大学"];

// 文部科学省「令和5年度 子供の学習費調査」の学習費総額（万円/年）を
// 参考にした目安。大学は同調査の対象外のため概算。
export const SCHOOL_PRESETS: Record<
  SchoolStage,
  { start: number; end: number; public: number; private: number }
> = {
  幼稚園: { start: 3, end: 5, public: 17, private: 31 },
  小学校: { start: 6, end: 11, public: 35, private: 167 },
  中学校: { start: 12, end: 14, public: 54, private: 144 },
  高校: { start: 15, end: 17, public: 51, private: 106 },
  大学: { start: 18, end: 21, public: 60, private: 120 },
};

export const DEFAULT_PROFILE: AdvProfile = {
  savings: 500,
  income: 500,
  livingMonthly: 20,
  rentMonthly: 10,
  pensionMonthly: 20,
};

// 家計調査（2025年）の65歳以上夫婦無職世帯の消費支出は約26.4万円/月。
// 現役世代の生活費から退職後に約15%下がる想定。
export const RETIREMENT_LIVING_RATE = 0.85;
export const PENSION_START_AGE = 65;

// 日本自動車工業会・オカネコ調査などから、購入300万円・維持24万円/年・
// 10年ごとの買い替えをプリセットにする。
export const CAR_PRICE = 300;
export const CAR_MAINTENANCE_ANNUAL = 24;
export const CAR_REPLACE_YEARS = 10;

// 高額療養費制度の自己負担例（20〜50万円/治療）と、がんの生涯罹患リスク
// （約2人に1人）を踏まえた簡易的な備え。
export const ILLNESS_COST = 100;
export const CARE_ONE_TIME = 47;
export const CARE_MONTHLY = 9;
export const CARE_YEARS = 5;
export const CARE_START_AGE = 80;

export const BUY_PRESETS = [
  { label: "3,000万円（頭金0）", price: 3000, downPaymentRate: 0 },
  { label: "4,000万円（頭金20%）", price: 4000, downPaymentRate: 0.2 },
  { label: "5,000万円（頭金20%）", price: 5000, downPaymentRate: 0.2 },
  { label: "6,000万円（頭金20%）", price: 6000, downPaymentRate: 0.2 },
];

export const INVESTMENT_PRESETS = [
  { label: "なし", monthly: 0 },
  { label: "NISA 3万円/月", monthly: 3 },
  { label: "NISA 5万円/月", monthly: 5 },
  { label: "NISA 8万円/月", monthly: 8 },
];

export const RETIREMENT_OPTIONS = [55, 60, 65, 70];

export const MORTGAGE_RATE = 1.5;
export const MORTGAGE_YEARS = 35;
export const INVESTMENT_RETURN = 1.03;
