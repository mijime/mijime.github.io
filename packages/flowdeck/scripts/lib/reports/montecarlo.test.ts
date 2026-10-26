import { describe, expect, it } from "vitest";
import { TOKEN_POLICIES, samplePolicies } from "./montecarlo";

describe("samplePolicies", () => {
  it("トークン政策の比較用に中立の重みを必ず含める", () => {
    const policies = samplePolicies(4, 1);
    expect(policies).toHaveLength(TOKEN_POLICIES.length + 4);
    expect(policies.slice(0, TOKEN_POLICIES.length)).toEqual(
      TOKEN_POLICIES.map((tokenPolicy) => ({
        tokenPolicy,
        weights: { focus: 0, greed: 0, urgency: 0 },
      })),
    );
  });

  it("同じseedなら同じサンプルを返す", () => {
    expect(samplePolicies(8, 42)).toEqual(samplePolicies(8, 42));
    expect(samplePolicies(8, 42)).not.toEqual(samplePolicies(8, 43));
  });

  it("重みは-1〜1の範囲に収まる", () => {
    for (const policy of samplePolicies(20, 7)) {
      if (!policy.weights) continue;
      for (const value of Object.values(policy.weights)) {
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});
