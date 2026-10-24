import type { RiskPlugin } from "./types";

export const wildcardRisk: RiskPlugin<"wildcard"> = {
  kind: "wildcard",
  resolve: (effect) => ({ wildcard: effect.amount, tone: "bad" }),
};
