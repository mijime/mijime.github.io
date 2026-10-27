import { discardHand } from "../../hand";
import { pushLog } from "../../log";
import { penaltyTargets } from "./targets";
import type { TaskPenaltyPlugin } from "./types";

export const discardHandPenalty: TaskPenaltyPlugin<"discardHand"> = {
  kind: "discardHand",
  describe: (penalty) => (penalty.target === "all" ? "全員の手札を捨てる" : "担当者の手札を捨てる"),
  generationValue: (penalty) => (penalty.target === "all" ? 1.4 : 1.0),
  apply({ state, task }, penalty) {
    for (const player of penaltyTargets(state, task, penalty.target)) {
      const discarded = discardHand(player);
      pushLog(state, `罰則: ${task.title} → ${player.name} の手札 ${discarded}枚を捨て札へ`, "bad");
    }
  },
};
