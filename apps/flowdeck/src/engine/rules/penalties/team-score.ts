import { pushLog } from "../../log";
import type { TaskPenaltyPlugin } from "./types";

export const teamScorePenalty: TaskPenaltyPlugin<"teamScore"> = {
  kind: "teamScore",
  describe: (penalty) => `企業価値-${penalty.amount}`,
  generationValue: (penalty) => penalty.amount * 0.4,
  apply({ state, task }, penalty) {
    state.scorePenalty += penalty.amount;
    pushLog(state, `罰則: ${task.title} → チームスコア -${penalty.amount}`, "bad");
  },
};
