import type { RiskPlugin } from "./types";

export const tokenRisk: RiskPlugin<"token"> = {
  kind: "token",
  resolve: (effect) => ({ token: effect.amount, tone: "good" }),
};
