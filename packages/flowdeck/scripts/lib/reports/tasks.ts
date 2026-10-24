import { RISK_BY_ID } from "../../../src/data/risks";
import { taskEfficiency, taskValue, totalRequirements } from "../../../src/data/generationMath";
import type { TaskCard } from "../../../src/engine/types";
import { formatNumber, formatPercent, mean, rate } from "../stats";
import { heading, printTable, subheading } from "../format";
import type { RunResult } from "../runner";

export type TaskClass = "standard" | "high-score" | "effect" | "incident";

export function taskClass(task: {
  kind?: TaskCard["kind"];
  reward: TaskCard["reward"];
  score: number;
}): TaskClass {
  if (task.kind === "incident") return "incident";
  if (task.reward.effect) return "effect";
  if (task.score >= 4) return "high-score";
  return "standard";
}

export function printTasks(results: RunResult[]): void {
  const runs = Math.max(1, results.length);
  const poolValues: number[] = [];
  const poolRequirements: number[] = [];
  const poolRewards: number[] = [];
  const poolEfficiency: number[] = [];
  const done = new Map<TaskClass, number>();
  const expired = new Map<TaskClass, number>();
  const scoreDone = new Map<number, number>();
  const scoreExpired = new Map<number, number>();
  const rewardDone = new Map<number, number>();
  const rewardExpired = new Map<number, number>();
  const effectDone = new Map<string, number>();
  const effectExpired = new Map<string, number>();

  for (const result of results) {
    const defs = result.state.taskDefs;
    for (const def of defs) {
      poolValues.push(taskValue(def));
      poolRequirements.push(totalRequirements(def.requirements));
      poolRewards.push(def.reward.level);
      poolEfficiency.push(taskEfficiency(def));
    }
    for (const task of result.state.tasks) {
      if (task.lane !== "done" && task.lane !== "trash") continue;
      const category = taskClass(task);
      const target = task.lane === "done" ? done : expired;
      target.set(category, (target.get(category) ?? 0) + 1);
      const byScore = task.lane === "done" ? scoreDone : scoreExpired;
      byScore.set(task.score, (byScore.get(task.score) ?? 0) + 1);
      const byReward = task.lane === "done" ? rewardDone : rewardExpired;
      byReward.set(task.reward.level, (byReward.get(task.reward.level) ?? 0) + 1);
      if (task.reward.effect) {
        const byEffect = task.lane === "done" ? effectDone : effectExpired;
        byEffect.set(task.reward.effect.kind, (byEffect.get(task.reward.effect.kind) ?? 0) + 1);
      }
    }
  }

  heading(`tasks  ${results.length} seeds`);
  subheading("生成プール");
  console.log(
    `  score            avg=${formatNumber(mean(poolValues))} / requirement avg=${formatNumber(mean(poolRequirements))} / reward lv avg=${formatNumber(mean(poolRewards), 2)}`,
  );
  console.log(
    `  efficiency       avg=${formatNumber(mean(poolEfficiency), 3)} / too-cheap(>0.45)=${formatPercent(rate(poolEfficiency.filter((value) => value > 0.45).length, poolEfficiency.length))} / too-expensive(<0.25)=${formatPercent(rate(poolEfficiency.filter((value) => value < 0.25).length, poolEfficiency.length))}`,
  );

  subheading("アーキタイプ別の完了率");
  printTable(
    ["class", "done/game", "expired/game", "rate"],
    (["standard", "high-score", "effect", "incident"] as const).map((category) => {
      const completed = done.get(category) ?? 0;
      const gone = expired.get(category) ?? 0;
      return [
        category,
        formatNumber(completed / runs),
        formatNumber(gone / runs),
        formatPercent(rate(completed, completed + gone)),
      ];
    }),
  );

  subheading("スコア別の完了率");
  printTable(
    ["score", "done", "expired", "rate"],
    [...new Set([...scoreDone.keys(), ...scoreExpired.keys()])]
      .toSorted((a, b) => a - b)
      .map((score) => [
        String(score),
        String(scoreDone.get(score) ?? 0),
        String(scoreExpired.get(score) ?? 0),
        formatPercent(
          rate(
            scoreDone.get(score) ?? 0,
            (scoreDone.get(score) ?? 0) + (scoreExpired.get(score) ?? 0),
          ),
        ),
      ]),
  );

  subheading("報酬レベル別の完了率");
  printTable(
    ["reward", "done", "expired", "rate"],
    [...new Set([...rewardDone.keys(), ...rewardExpired.keys()])]
      .toSorted((a, b) => a - b)
      .map((level) => [
        `lv${level}`,
        String(rewardDone.get(level) ?? 0),
        String(rewardExpired.get(level) ?? 0),
        formatPercent(
          rate(
            rewardDone.get(level) ?? 0,
            (rewardDone.get(level) ?? 0) + (rewardExpired.get(level) ?? 0),
          ),
        ),
      ]),
  );

  subheading("カード効果の完了率");
  printTable(
    ["effect", "done", "expired", "rate"],
    [...new Set([...effectDone.keys(), ...effectExpired.keys()])]
      .toSorted((a, b) => b.localeCompare(a))
      .map((kind) => [
        kind,
        String(effectDone.get(kind) ?? 0),
        String(effectExpired.get(kind) ?? 0),
        formatPercent(
          rate(
            effectDone.get(kind) ?? 0,
            (effectDone.get(kind) ?? 0) + (effectExpired.get(kind) ?? 0),
          ),
        ),
      ]),
  );

  subheading("リスクカード別");
  const risks = new Map<string, { drawn: number; absorbed: number; unmet: number; debt: number }>();
  for (const result of results) {
    for (const [id, stat] of Object.entries(result.state.riskStats)) {
      const title = RISK_BY_ID[id]?.title ?? id;
      const entry = risks.get(title) ?? { drawn: 0, absorbed: 0, unmet: 0, debt: 0 };
      entry.drawn += stat.drawn;
      entry.absorbed += stat.absorbed;
      entry.unmet += stat.unmet;
      entry.debt += stat.debt;
      risks.set(title, entry);
    }
  }
  printTable(
    ["card", "draw/game", "absorbed", "unmet", "debt/game"],
    [...risks.entries()]
      .toSorted((a, b) => b[1].debt - a[1].debt)
      .map(([title, stat]) => [
        title,
        formatNumber(stat.drawn / runs),
        formatNumber(stat.absorbed / runs),
        formatNumber(stat.unmet / runs),
        formatNumber(stat.debt / runs, 2),
      ]),
  );
}
