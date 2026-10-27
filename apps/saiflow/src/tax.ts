/**
 * 額面の給与収入から、所得税・住民税・社会保険料の概算を引くための簡易モデル。
 *
 * 実際の税額は自治体・年齢・扶養・各種控除で大きく変わるため、ここでは
 * 「給与収入に対する実効負担率」の目安だけを持つ。
 */
const TAXABLE_INCOME = /年収|給与|給料|賞与|副業/;
const EXPLICIT_TAX = /所得税|住民税|社会保険/;

export function isTaxableIncomeEvent(name: string): boolean {
  return TAXABLE_INCOME.test(name);
}

export function hasExplicitTaxEvent(eventNames: string[]): boolean {
  return eventNames.some((name) => name === "税金" || EXPLICIT_TAX.test(name));
}

export function effectiveTaxRate(gross: number): number {
  if (gross <= 300) return 0.15;
  if (gross <= 500) return 0.18;
  if (gross <= 700) return 0.2;
  if (gross <= 1000) return 0.22;
  if (gross <= 1500) return 0.26;
  return 0.31;
}

export function estimateIncomeTax(gross: number): number {
  if (gross <= 0) return 0;
  return Math.round(gross * effectiveTaxRate(gross));
}
