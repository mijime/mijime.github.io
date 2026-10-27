import { addDebt } from "../../debt";
import { pushLog } from "../../log";
import { penaltyTargets } from "./targets";
import type { TaskPenaltyPlugin } from "./types";

export const debtPenalty: TaskPenaltyPlugin<"debt"> = {
  kind: "debt",
  describe: (penalty) => `${penalty.target === "all" ? "全員" : "担当者"}に負債${penalty.amount}`,
  generationValue: (penalty) =>
    penalty.target === "all" ? 1.2 + penalty.amount * 0.3 : 0.8 + penalty.amount * 0.25,
  apply({ state, task }, penalty) {
    const targets = penaltyTargets(state, task, penalty.target);
    pushLog(
      state,
      `罰則: ${task.title} → ${penalty.target === "all" ? "全員" : "担当者"}に負債 ${penalty.amount}枚`,
      "bad",
    );
    for (const player of targets) addDebt(state, player, penalty.amount, "incident");
  },
};
