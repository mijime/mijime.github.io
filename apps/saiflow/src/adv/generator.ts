import type { Event } from "../types";
import {
  CAR_MAINTENANCE_ANNUAL,
  CAR_PRICE,
  CAR_REPLACE_YEARS,
  CARE_MONTHLY,
  CARE_ONE_TIME,
  CARE_START_AGE,
  CARE_YEARS,
  ILLNESS_COST,
  INVESTMENT_RETURN,
  PENSION_START_AGE,
  RETIREMENT_LIVING_RATE,
  SCHOOL_PRESETS,
  SCHOOL_STAGES,
} from "./presets";
import type { AdvFlags, AdvProfile, ChildPlan, SchoolStage } from "./types";

function annualMortgagePayment(principal: number, rate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  if (rate <= 0) return Math.round(principal / years);
  const r = rate / 100;
  const factor = (1 + r) ** years;
  return Math.round((principal * r * (1 + r) ** (years - 1)) / (factor - 1));
}

function childEvents(child: ChildPlan, childNo: number): Event[] {
  const events: Event[] = [];
  const label = `子${childNo}`;
  for (const stage of SCHOOL_STAGES) {
    const type = child.schools[stage];
    if (!type || type === "skip") continue;
    const preset = SCHOOL_PRESETS[stage];
    const cost = preset[type];
    if (cost <= 0) continue;
    events.push({
      name: `教育費(${label} ${stage})`,
      group: `子供(${label})`,
      startAge: child.birthAge + preset.start,
      endAge: child.birthAge + preset.end,
      ops: [{ asset: "現金", op: "-", value: cost }],
    });
  }
  return events;
}

export function buildAdvExtras(flags: AdvFlags, startAge: number, planEndAge: number): Event[] {
  const events: Event[] = [];
  if (flags.child1) events.push(...childEvents(flags.child1, 1));
  if (flags.child2) events.push(...childEvents(flags.child2, 2));

  if (flags.car) {
    const { startAge: carStart, mode } = flags.car;
    events.push({
      name: "車維持費",
      group: "車",
      startAge: carStart,
      endAge: null,
      ops: [{ asset: "現金", op: "-", value: CAR_MAINTENANCE_ANNUAL }],
    });
    if (mode === "buy") {
      for (
        let purchaseAge = carStart;
        purchaseAge <= planEndAge;
        purchaseAge += CAR_REPLACE_YEARS
      ) {
        events.push({
          name: "車購入",
          group: "車",
          startAge: purchaseAge,
          endAge: purchaseAge,
          ops: [{ asset: "現金", op: "-", value: CAR_PRICE }],
        });
      }
    }
  }

  if (flags.risk) {
    if (flags.risk.illness) {
      const illnessAge = Math.max(60, startAge);
      if (illnessAge <= planEndAge) {
        events.push({
          name: "大病",
          group: "リスク",
          startAge: illnessAge,
          endAge: illnessAge,
          ops: [{ asset: "現金", op: "-", value: ILLNESS_COST }],
        });
      }
    }
    if (flags.risk.care) {
      const careStart = Math.max(CARE_START_AGE, startAge);
      if (careStart <= planEndAge) {
        events.push({
          name: "介護一時費用",
          group: "リスク",
          startAge: careStart,
          endAge: careStart,
          ops: [{ asset: "現金", op: "-", value: CARE_ONE_TIME }],
        });
        for (let offset = 0; offset < CARE_YEARS; offset++) {
          const careAge = careStart + offset;
          if (careAge > planEndAge) break;
          events.push({
            name: "介護費用",
            group: "リスク",
            startAge: careAge,
            endAge: careAge,
            ops: [{ asset: "現金", op: "-", value: CARE_MONTHLY * 12 }],
          });
        }
      }
    }
  }

  for (const oneOff of flags.oneOffs) {
    events.push({
      name: oneOff.name,
      group: "その他",
      startAge: oneOff.age,
      endAge: oneOff.age,
      ops: [
        {
          asset: "現金",
          op: oneOff.amount >= 0 ? "+" : "-",
          value: Math.abs(oneOff.amount),
        },
      ],
    });
  }

  return events;
}

export function buildAdvHousing(
  housing: AdvFlags["housing"],
  startAge: number,
  currentYearRent = 0,
): Event[] {
  const events: Event[] = [];
  if (!housing) return events;

  if (housing.type === "rent") {
    events.push({
      name: "住居費(賃貸)",
      group: "住居",
      startAge,
      endAge: null,
      ops: [{ asset: "現金", op: "-", value: housing.monthly * 12 }],
    });
    return events;
  }

  const purchaseAge = startAge + 1;
  if (currentYearRent > 0) {
    events.push({
      name: "住居費(賃貸)",
      group: "住居",
      startAge,
      endAge: startAge,
      ops: [{ asset: "現金", op: "-", value: currentYearRent * 12 }],
    });
  }

  const loan = Math.max(0, housing.price - housing.downPayment);
  const annualPayment = annualMortgagePayment(loan, housing.rate, housing.years);

  events.push({
    name: "住宅(取得)",
    group: "住宅ローン",
    startAge: purchaseAge,
    endAge: purchaseAge,
    ops: [{ asset: "住宅", op: "+", value: housing.price }],
  });

  if (housing.downPayment > 0) {
    events.push({
      name: "頭金",
      group: "住宅ローン",
      startAge: purchaseAge,
      endAge: purchaseAge,
      ops: [{ asset: "現金", op: "-", value: housing.downPayment }],
    });
  }

  if (loan > 0) {
    events.push(
      {
        name: "借入実行",
        group: "住宅ローン",
        startAge: purchaseAge,
        endAge: purchaseAge,
        ops: [{ asset: "借入", op: "-", value: loan }],
      },
      {
        name: "借入返済",
        group: "住宅ローン",
        startAge: purchaseAge,
        endAge: purchaseAge + housing.years - 1,
        ops: [
          { asset: "現金", op: "-", value: annualPayment },
          { asset: "借入", op: "+", value: annualPayment },
        ],
      },
      {
        name: "借入金利",
        group: "住宅ローン",
        startAge: purchaseAge,
        endAge: purchaseAge + housing.years - 1,
        ops: [{ asset: "借入", op: "*", value: 1 + housing.rate / 100 }],
      },
    );
  }

  if (housing.annualTax > 0) {
    events.push({
      name: "税金(固定資産税)",
      group: "住宅ローン",
      startAge: purchaseAge,
      endAge: null,
      ops: [{ asset: "現金", op: "-", value: housing.annualTax }],
    });
  }

  return events;
}

export function buildAdvInvestment(flags: AdvFlags, startAge: number): Event[] {
  const retirementAge = flags.retirementAge ?? 65;
  const incomeEnd = retirementAge - 1;
  const investmentStart = flags.investmentStartAge ?? startAge;
  if (!flags.investmentMonthly || flags.investmentMonthly <= 0 || incomeEnd < investmentStart) {
    return [];
  }

  const annual = flags.investmentMonthly * 12;
  return [
    {
      name: "NISA積立",
      group: "投資",
      startAge: investmentStart,
      endAge: incomeEnd,
      ops: [
        { asset: "現金", op: "-", value: annual },
        { asset: "NISA", op: "+", value: annual },
      ],
    },
    {
      name: "NISA運用",
      group: "投資",
      startAge: investmentStart,
      endAge: null,
      ops: [{ asset: "NISA", op: "*", value: INVESTMENT_RETURN }],
    },
  ];
}

/** 既存プランの家賃を、購入年の前年で止める。 */
export function adjustBaseForHousing(events: Event[], purchaseAge: number): Event[] {
  return events.map((event) => {
    if (!/住居費|家賃/.test(event.name)) return event;
    if (event.endAge !== null && event.endAge < purchaseAge) return event;
    return { ...event, endAge: purchaseAge - 1 };
  });
}

/** 既存プランの給与収入を、指定した退職年齢で止める。 */
export function adjustBaseForRetirement(events: Event[], retirementAge: number): Event[] {
  return events.map((event) => {
    if (!/年収|給与|給料|賞与|副業/.test(event.name)) return event;
    if (event.endAge !== null && event.endAge < retirementAge) return event;
    return { ...event, endAge: retirementAge - 1 };
  });
}

export function buildAdvEvents(
  profile: AdvProfile,
  flags: AdvFlags,
  startAge: number,
  planEndAge = startAge + 45,
): Event[] {
  const events: Event[] = [];
  const retirementAge = flags.retirementAge ?? 65;
  const incomeEnd = retirementAge - 1;

  if (profile.savings > 0) {
    events.push({
      name: "初期現金",
      group: "初期設定",
      startAge,
      endAge: startAge,
      ops: [{ asset: "現金", op: "+", value: profile.savings }],
    });
  }

  if (profile.income > 0 && incomeEnd >= startAge) {
    events.push({
      name: "年収",
      group: "収入",
      startAge,
      endAge: incomeEnd,
      ops: [{ asset: "現金", op: "+", value: profile.income }],
    });
  }

  if (profile.livingMonthly > 0) {
    const workingLiving = profile.livingMonthly * 12;
    const retiredLiving = Math.round(workingLiving * RETIREMENT_LIVING_RATE);
    if (retirementAge > startAge) {
      events.push({
        name: "生活費",
        group: "生活",
        startAge,
        endAge: retirementAge - 1,
        ops: [{ asset: "現金", op: "-", value: workingLiving }],
      });
      events.push({
        name: "生活費(退職後)",
        group: "生活",
        startAge: retirementAge,
        endAge: null,
        ops: [{ asset: "現金", op: "-", value: retiredLiving }],
      });
    } else {
      events.push({
        name: "生活費",
        group: "生活",
        startAge,
        endAge: null,
        ops: [{ asset: "現金", op: "-", value: retiredLiving }],
      });
    }
  }

  if (profile.pensionMonthly > 0 && planEndAge >= Math.max(PENSION_START_AGE, startAge)) {
    events.push({
      name: "年金",
      group: "収入",
      startAge: Math.max(PENSION_START_AGE, startAge),
      endAge: null,
      ops: [{ asset: "現金", op: "+", value: profile.pensionMonthly * 12 }],
    });
  }

  events.push(...buildAdvHousing(flags.housing, startAge, profile.rentMonthly));
  events.push(...buildAdvInvestment(flags, startAge));
  events.push(...buildAdvExtras(flags, startAge, planEndAge));

  return events;
}

export function schoolCost(stage: SchoolStage, type: "public" | "private"): number {
  return SCHOOL_PRESETS[stage][type];
}
