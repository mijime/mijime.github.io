import type { RiskDef } from "../engine/types";

const requirement = (id: string, phase: "design" | "dev" | "test", amount: number): RiskDef => ({
  id,
  title:
    phase === "design"
      ? `仕様追加 +${amount}`
      : phase === "dev"
        ? `実装要求 +${amount}`
        : `品質要求 +${amount}`,
  description:
    phase === "design"
      ? `設計の余剰作業 ${amount} で吸収。足りなければ技術的負債+1`
      : phase === "dev"
        ? `開発の余剰作業 ${amount} で吸収。足りなければ技術的負債+1`
        : `テストの余剰作業 ${amount} で吸収。足りなければ技術的負債+1`,
  effect: { kind: "require", phase, amount },
});

const wildcard = (id: string, amount: number): RiskDef => ({
  id,
  title: `仕様変更 +${amount}`,
  description: `任意フェーズの余剰作業 ${amount} で吸収。足りなければ技術的負債+1`,
  effect: { kind: "wildcard", amount },
});

const opportunity = (id: string, amount: number): RiskDef => ({
  id,
  title: "想定外の好機",
  description: `LLMトークン +${amount}`,
  effect: { kind: "token", amount },
});

export const RISK_DEFS: RiskDef[] = [
  requirement("r-design1a", "design", 1),
  requirement("r-design1b", "design", 1),
  requirement("r-dev1a", "dev", 1),
  requirement("r-dev1b", "dev", 1),
  requirement("r-test1a", "test", 1),
  requirement("r-test1b", "test", 1),
  requirement("r-design2", "design", 2),
  requirement("r-dev2", "dev", 2),
  requirement("r-test2", "test", 2),
  wildcard("r-wild2", 2),
  wildcard("r-wild1a", 1),
  wildcard("r-wild1b", 1),
  opportunity("r-token1a", 1),
  opportunity("r-token1b", 1),
  {
    id: "r-none1",
    title: "問題なし",
    description: "今回は何も起きなかった",
    effect: { kind: "nothing" },
  },
  {
    id: "r-none2",
    title: "問題なし",
    description: "今回は何も起きなかった",
    effect: { kind: "nothing" },
  },
];

export const RISK_BY_ID: Record<string, RiskDef> = Object.fromEntries(
  RISK_DEFS.map((risk) => [risk.id, risk]),
);
