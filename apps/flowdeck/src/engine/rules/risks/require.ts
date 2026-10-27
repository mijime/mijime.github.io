import type { RiskPlugin } from "./types";

export const requireRisk: RiskPlugin<"require"> = {
  kind: "require",
  resolve: (effect) => ({
    requirement: { phase: effect.phase, amount: effect.amount },
    tone: "bad",
  }),
};
