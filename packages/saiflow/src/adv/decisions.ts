import { SCHOOL_PRESETS, SCHOOL_STAGES } from "./presets";
import type { AdvFlags, Decision, PendingDecision } from "./types";

const PRIORITY: Record<Decision["kind"], number> = {
  housing: 0,
  child1: 1,
  child2: 2,
  school: 3,
  investment: 4,
  car: 5,
  retirement: 6,
  risk: 7,
};

export function retirementAskAge(startAge: number, endAge: number): number {
  return Math.min(endAge, Math.max(startAge + 5, 50));
}

export function getPendingDecisions(
  startAge: number,
  endAge: number,
  flags: AdvFlags,
): PendingDecision[] {
  const pending: PendingDecision[] = [];

  if (!flags.housing && !flags.housingAsked && startAge <= endAge) {
    pending.push({ age: startAge, decision: { kind: "housing" } });
  }
  if (!flags.child1Asked && startAge + 1 <= endAge) {
    pending.push({ age: Math.min(startAge + 1, endAge), decision: { kind: "child1" } });
  }
  if (flags.child1 && !flags.child2Asked && flags.child1.birthAge + 2 <= endAge) {
    pending.push({
      age: flags.child1.birthAge + 2,
      decision: { kind: "child2" },
    });
  }
  if (!flags.investmentAsked) {
    pending.push({
      age: Math.min(startAge + 2, endAge),
      decision: { kind: "investment" },
    });
  }
  if (!flags.carAsked && startAge + 3 <= endAge) {
    pending.push({
      age: startAge + 3,
      decision: { kind: "car" },
    });
  }
  if (flags.retirementAge === undefined) {
    pending.push({
      age: retirementAskAge(startAge, endAge),
      decision: { kind: "retirement" },
    });
  }
  const riskAge = Math.max(60, startAge);
  if (!flags.riskAsked && riskAge <= endAge) {
    pending.push({
      age: riskAge,
      decision: { kind: "risk" },
    });
  }

  const children: [1 | 2, AdvFlags["child1"]][] = [
    [1, flags.child1],
    [2, flags.child2],
  ];
  for (const [childNo, child] of children) {
    if (!child) continue;
    for (const stage of SCHOOL_STAGES) {
      if (child.schools[stage]) continue;
      const age = child.birthAge + SCHOOL_PRESETS[stage].start;
      if (age > endAge) continue;
      pending.push({
        age,
        decision: { kind: "school", child: childNo, stage },
      });
    }
  }

  return pending.toSorted(
    (a, b) => a.age - b.age || PRIORITY[a.decision.kind] - PRIORITY[b.decision.kind],
  );
}

export function getDueDecision(
  startAge: number,
  endAge: number,
  age: number,
  flags: AdvFlags,
): PendingDecision | null {
  return getPendingDecisions(startAge, endAge, flags).find((pending) => pending.age <= age) ?? null;
}

export function getNextDecisionAge(
  startAge: number,
  endAge: number,
  age: number,
  flags: AdvFlags,
): number | null {
  return (
    getPendingDecisions(startAge, endAge, flags).find((pending) => pending.age > age)?.age ?? null
  );
}
