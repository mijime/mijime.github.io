import { fmt } from "./utils.ts";
import type { Scenario, YearRow } from "./types";

export type AdviceLevel = "danger" | "warning" | "info" | "good";

export interface Advice {
  id: string;
  level: AdviceLevel;
  title: string;
  detail: string;
}

const LIABILITY = /借入|ローン|負債/;
const HOUSE = /住宅|自宅/;
const EDUCATION = /教育費|受験料/;

const SAVINGS_RATE_LOW = 0.1;
const SAVINGS_RATE_GOOD = 0.2;
const HOUSING_RATIO_HIGH = 0.3;
const CASH_MONTHS_LOW = 3;
const CASH_RATIO_HIGH = 0.5;

function wan(n: number): string {
  return `${fmt(Math.round(n))}万円`;
}

function signedWan(n: number): string {
  return `${n < 0 ? "-" : ""}${wan(Math.abs(n))}`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildAdvice(rows: YearRow[], scenario: Scenario, currentAge: number): Advice[] {
  if (rows.length === 0) return [];

  const advice: Advice[] = [];
  const add = (level: AdviceLevel, id: string, title: string, detail: string) => {
    advice.push({ id, level, title, detail });
  };

  const first = rows[0];
  const last = rows[rows.length - 1];
  const minRow = rows.reduce((min, row) => (row.totalAssets < min.totalAssets ? row : min), first);
  const negativeRow = rows.find((row) => row.totalAssets < 0);

  // Recurring income (salary etc.) rather than one-off opening balances.
  // Ignore the first row when possible and use 40% of the largest remaining
  // income as the threshold for "main income".
  const incomeCandidates = rows.length > 1 ? rows.slice(1) : rows;
  const maxIncome = Math.max(...incomeCandidates.map((row) => row.totalIncome), 0);
  const mainIncomeThreshold = maxIncome * 0.4;
  const mainIncomeRows =
    mainIncomeThreshold > 0 ? rows.filter((row) => row.totalIncome >= mainIncomeThreshold) : [];
  const mainIncomeEnd =
    mainIncomeRows.length > 0 ? mainIncomeRows[mainIncomeRows.length - 1].age : null;

  // 1. Net worth
  if (negativeRow) {
    const when = negativeRow.age === first.age ? "現在" : `${negativeRow.age}歳`;
    const incomeNote = mainIncomeEnd ? ` 主な収入は${mainIncomeEnd}歳で終了予定です。` : "";
    add(
      "danger",
      "assets-negative",
      `${when}の総資産がマイナスです`,
      `最小は${signedWan(minRow.totalAssets)}（${minRow.age}歳）。${incomeNote} 支出の見直しや収入期間の延長を検討してください。`,
    );
  } else {
    add(
      "good",
      "assets-positive",
      "総資産はマイナスになりません",
      `シミュレーション最終時点（${last.age}歳）の総資産は${wan(last.totalAssets)}です。`,
    );
  }

  // 2. Income
  if (maxIncome === 0) {
    add(
      "warning",
      "no-income",
      "継続的な収入イベントがありません",
      "このままでは生活費を資産の取り崩しだけで賄う計画になります。",
    );
  } else if (mainIncomeEnd !== null && mainIncomeEnd < last.age) {
    if (mainIncomeEnd < 65) {
      add(
        "info",
        "income-end",
        `主な収入は${mainIncomeEnd}歳で終わります`,
        `65歳より前の収入終了です。${mainIncomeEnd}歳から${last.age}歳までは資産と年金等で賄う前提になります。`,
      );
    }
  }

  const rateRows = mainIncomeRows.length > 1 ? mainIncomeRows.slice(1) : mainIncomeRows;
  const totalIncome = rateRows.reduce((sum, row) => sum + row.totalIncome, 0);
  const totalExpense = rateRows.reduce((sum, row) => sum + row.totalExpense, 0);

  // 3. Savings rate / recurring deficits
  if (totalIncome > 0) {
    const rate = (totalIncome - totalExpense) / totalIncome;
    if (rate < 0) {
      add(
        "warning",
        "savings-negative",
        "現金収支が平均で赤字です",
        `収入がある年の平均収支は${signedWan((totalIncome - totalExpense) / rateRows.length)}/年です。`,
      );
    } else if (rate < SAVINGS_RATE_LOW) {
      add(
        "warning",
        "savings-low",
        `貯蓄率が低めです（${Math.round(rate * 100)}%）`,
        "収入に対する支出の割合が高く、資産が増えにくい状態です。",
      );
    } else if (rate >= SAVINGS_RATE_GOOD) {
      add(
        "good",
        "savings-good",
        `貯蓄率は${Math.round(rate * 100)}%です`,
        "収入がある年の平均で、収入の2割以上を資産に回せています。",
      );
    }
  }

  if (mainIncomeEnd !== null) {
    const workingDeficits = rows.filter(
      (row) =>
        row.age <= mainIncomeEnd && row.totalIncome > 0 && row.totalIncome - row.totalExpense < 0,
    );
    if (workingDeficits.length >= 2) {
      const firstDeficit = workingDeficits[0];
      add(
        "warning",
        "working-deficit",
        `収入があるのに赤字の年が${workingDeficits.length}年あります`,
        `最初は${firstDeficit.age}歳（${signedWan(firstDeficit.totalIncome - firstDeficit.totalExpense)}）。一時的な大型支出か、毎年の収支悪化かを確認してください。`,
      );
    } else if (workingDeficits.length === 1) {
      const row = workingDeficits[0];
      add(
        "info",
        "one-off-deficit",
        "一時的に現金収支がマイナスの年があります",
        `${row.age}歳の収支は${signedWan(row.totalIncome - row.totalExpense)}です。住宅購入など一時的な支出か確認してください。`,
      );
    }
  }

  // 4. Cash buffer and allocation
  const cash = first.balances["現金"] ?? 0;
  const recentRows = rows.slice(0, Math.min(5, rows.length));
  const monthlyExpense = average(recentRows.map((row) => row.totalExpense)) / 12;

  if (cash < 0) {
    add(
      "danger",
      "cash-negative",
      "現金がマイナスです",
      `現在の現金残高は${signedWan(cash)}です。支払い不能の状態を表しています。`,
    );
  } else if (monthlyExpense > 0 && cash / monthlyExpense < CASH_MONTHS_LOW) {
    add(
      "warning",
      "cash-low",
      `現金が生活費の約${(cash / monthlyExpense).toFixed(1)}ヶ月分です`,
      "目安の3ヶ月分を下回っています。突発的な支出に備えた現金の確保を検討してください。",
    );
  }

  const investableNames = Object.keys(first.balances).filter(
    (name) => name !== "現金" && !LIABILITY.test(name) && !HOUSE.test(name),
  );
  const investable = investableNames.reduce(
    (sum, name) => sum + Math.max(0, first.balances[name] ?? 0),
    0,
  );
  if (cash > 0 && investable > 0) {
    const cashRatio = cash / (cash + investable);
    if (cashRatio > CASH_RATIO_HIGH) {
      add(
        "info",
        "cash-heavy",
        `現金比率が${Math.round(cashRatio * 100)}%です`,
        `投資資産は${wan(investable)}あります。現金の比率が高めなので、長期運用に回す余地があるかもしれません。`,
      );
    }
  }

  // 5. Housing loan
  const liabilityNames = [...new Set(rows.flatMap((row) => Object.keys(row.balances)))].filter(
    (name) => LIABILITY.test(name),
  );

  for (const name of liabilityNames) {
    const finalBalance = last.balances[name] ?? 0;
    const debtStart = rows.findIndex((row) => (row.balances[name] ?? 0) < 0);
    if (debtStart < 0) continue;

    const maxDebt = Math.abs(rows.reduce((min, row) => Math.min(min, row.balances[name] ?? 0), 0));
    // Amounts are rounded to 万円, so treat a small residual as paid off.
    const tolerance = Math.max(0.5, maxDebt * 0.01);
    const paidRow = rows.slice(debtStart).find((row) => (row.balances[name] ?? 0) >= -tolerance);

    if (finalBalance > tolerance) {
      add(
        "warning",
        `loan-overpaid-${name}`,
        `${name}の残高がプラスになっています`,
        `最終残高は${wan(finalBalance)}です。返済額が元金を超えている可能性があります。`,
      );
    } else if (finalBalance < -tolerance) {
      add(
        "warning",
        `loan-unpaid-${name}`,
        `${name}は${last.age}歳時点で残高が残っています`,
        `シミュレーション期間内では完済しません。残高は${wan(Math.abs(finalBalance))}です。返済期間の延長や繰上返済を検討してください。`,
      );
    } else if (paidRow) {
      const residual = Math.abs(finalBalance);
      add(
        "good",
        `loan-paid-${name}`,
        `${name}は${paidRow.age}歳で完済します`,
        residual < 1
          ? "シミュレーション期間内に完済する計画です。"
          : `実質完済です（最終残高 ${wan(residual)}）。`,
      );
    }
  }

  const drawdowns = rows.flatMap((row) =>
    row.operations
      .filter(
        (operation) =>
          operation.eventName === "資産取り崩し" &&
          operation.op.asset === "現金" &&
          operation.op.op === "+",
      )
      .map((operation) => ({ age: row.age, amount: operation.op.value })),
  );

  if (drawdowns.length > 0) {
    const firstDrawdown = drawdowns[0];
    const maxDrawdown = Math.max(...drawdowns.map((item) => item.amount));
    const before =
      rows.find((row) => row.age === firstDrawdown.age - 1)?.totalAssets ??
      rows[0]?.totalAssets ??
      0;
    const withdrawalRate = before > 0 ? maxDrawdown / before : 0;
    if (withdrawalRate > 0.04) {
      add(
        "warning",
        "drawdown-high",
        `資産取り崩し率が4%を超えています（最大${Math.round(withdrawalRate * 100)}%）`,
        `${firstDrawdown.age}歳から資産の取り崩しが始まり、最大で年${wan(maxDrawdown)}を売却します。4%ルールを目安にするなら、支出の見直しや現金クッションの確保を検討してください。`,
      );
    } else {
      add(
        "info",
        "drawdown",
        `資産の取り崩しは${firstDrawdown.age}歳からです`,
        `最大で年${wan(maxDrawdown)}（前年資産の${Math.round(withdrawalRate * 100)}%）。現金が足りない分をNISAなどから自動で売却しています。`,
      );
    }
  }

  const liabilitySet = new Set(liabilityNames);
  const repaymentEvents = scenario.events.filter(
    (event) =>
      event.ops.some((op) => op.asset === "現金" && op.op === "-") &&
      event.ops.some((op) => liabilitySet.has(op.asset) && op.op === "+"),
  );
  const annualRepayment = repaymentEvents.reduce((sum, event) => {
    const cashOut = event.ops.find((op) => op.asset === "現金" && op.op === "-");
    return sum + (cashOut?.value ?? 0);
  }, 0);

  if (annualRepayment > 0) {
    const repaymentRows = rows.filter(
      (row) => row.totalIncome > 0 && liabilityNames.some((name) => (row.balances[name] ?? 0) < 0),
    );
    const avgIncome = average(repaymentRows.map((row) => row.totalIncome));
    if (avgIncome > 0) {
      const ratio = annualRepayment / avgIncome;
      if (ratio > HOUSING_RATIO_HIGH) {
        add(
          "warning",
          "housing-ratio-high",
          `住宅返済の負担が高めです（収入の${Math.round(ratio * 100)}%）`,
          `年間返済額は${wan(annualRepayment)}です。収入に対する返済比率が30%を超えています。`,
        );
      } else {
        add(
          "info",
          "housing-ratio",
          `年間返済額は${wan(annualRepayment)}（収入の${Math.round(ratio * 100)}%）`,
          "返済負担は収入の30%以内に収まっています。",
        );
      }
    }
  }

  // 6. Education costs
  if (mainIncomeEnd !== null) {
    const educationByAge = new Map<number, number>();
    for (const event of scenario.events) {
      if (!EDUCATION.test(event.name)) continue;
      const annual = event.ops
        .filter((op) => op.asset === "現金" && op.op === "-")
        .reduce((sum, op) => sum + op.value, 0);
      if (annual <= 0) continue;
      const start = Math.max(first.age, event.startAge);
      const end = Math.min(last.age, event.endAge ?? last.age);
      for (let age = start; age <= end; age++) {
        educationByAge.set(age, (educationByAge.get(age) ?? 0) + annual);
      }
    }

    const entries = [...educationByAge.entries()];
    if (entries.length > 0) {
      const [peakAge, peakAmount] = entries.reduce(
        (max, entry) => (entry[1] > max[1] ? entry : max),
        entries[0],
      );
      const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
      add(
        "info",
        "education-peak",
        `教育費のピークは${peakAge}歳（年${wan(peakAmount)}）`,
        `シミュレーション期間内の教育費合計は約${wan(total)}です。`,
      );
      if (peakAge > mainIncomeEnd) {
        add(
          "warning",
          "education-after-income",
          "教育費のピークが収入終了後にかかっています",
          `主な収入は${mainIncomeEnd}歳で終了し、教育費のピークは${peakAge}歳です。`,
        );
      }
    }
  }

  // 7. Data sanity checks
  for (const event of scenario.events) {
    if (event.endAge !== null && event.endAge < event.startAge) {
      add(
        "warning",
        `invalid-range-${event.name}`,
        `「${event.name}」の期間が逆転しています`,
        `開始${event.startAge}歳 / 終了${event.endAge}歳。終了年齢を開始年齢以降にしてください。`,
      );
    }
    if (event.ops.length === 0) {
      add(
        "info",
        `empty-event-${event.name}`,
        `「${event.name}」に操作がありません`,
        "資産の増減が定義されていないため、計算結果に影響しません。",
      );
    }
  }

  const events = scenario.events;
  const allPast =
    events.length > 0 &&
    events.every((event) => (event.endAge ?? event.startAge) < currentAge && event.endAge !== null);
  if (allPast) {
    add(
      "warning",
      "all-events-past",
      "イベントがすべて現在年齢より前です",
      "以前のデータは「0＝現在」の年数で保存されている可能性があります。年齢の基準を確認してください。",
    );
  }

  for (const name of Object.keys(last.balances)) {
    if (name === "現金" || LIABILITY.test(name) || HOUSE.test(name)) continue;
    const value = last.balances[name] ?? 0;
    if (value < 0) {
      add(
        "warning",
        `negative-asset-${name}`,
        `「${name}」がマイナスです`,
        `最終残高は${signedWan(value)}です。取り崩しが資産を超えていないか確認してください。`,
      );
    }
  }

  const order: Record<AdviceLevel, number> = {
    danger: 0,
    warning: 1,
    info: 2,
    good: 3,
  };
  return advice.toSorted((a, b) => order[a.level] - order[b.level]).slice(0, 10);
}
