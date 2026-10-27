import { pushLog } from "../../log";
import { penaltyTargets } from "./targets";
import type { TaskPenaltyPlugin } from "./types";

export const loseActionPenalty: TaskPenaltyPlugin<"loseAction"> = {
  kind: "loseAction",
  describe: (penalty) =>
    penalty.target === "all"
      ? `全員は翌日アクション-${penalty.amount}`
      : `担当者は翌日アクション-${penalty.amount}`,
  generationValue: (penalty) => penalty.amount + (penalty.target === "all" ? 0.3 : 0),
  apply({ state, task }, penalty) {
    for (const player of penaltyTargets(state, task, penalty.target)) {
      player.actionPenalty += penalty.amount;
    }
    pushLog(
      state,
      `罰則: ${task.title} → ${penalty.target === "all" ? "全員" : "担当者"}の次回アクション -${penalty.amount}`,
      "bad",
    );
  },
};
