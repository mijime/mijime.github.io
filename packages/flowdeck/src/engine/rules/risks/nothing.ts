import type { RiskPlugin } from "./types";

export const nothingRisk: RiskPlugin<"nothing"> = {
  kind: "nothing",
  resolve: () => ({ tone: "info" }),
};
