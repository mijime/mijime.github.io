import type { UncertaintyDef } from "../engine/types";

const requirement = (
  id: string,
  phase: "design" | "dev" | "test",
  amount: number,
): UncertaintyDef => ({
  id,
  title:
    phase === "design"
      ? `仕様追加 +${amount}`
      : phase === "dev"
        ? `実装要求 +${amount}`
        : `品質要求 +${amount}`,
  description:
    phase === "design"
      ? `miの設計提案で要求が +${amount} される`
      : phase === "dev"
        ? `jimeの実装要件が +${amount} される`
        : `jimeの品質基準が +${amount} される`,
  effect: { kind: "require", phase, amount },
});

const debt = (id: string, amount: number): UncertaintyDef => ({
  id,
  title: `技術的負債 +${amount}`,
  description: `技術的負債カードを ${amount} 枚獲得`,
  effect: { kind: "debt", amount },
});

export const UNCERTAINTY_DEFS: UncertaintyDef[] = [
  requirement("u-design2a", "design", 1),
  requirement("u-design2b", "design", 1),
  requirement("u-dev2a", "dev", 1),
  requirement("u-dev2b", "dev", 1),
  requirement("u-test2a", "test", 1),
  requirement("u-test2b", "test", 1),
  requirement("u-design4a", "design", 2),
  requirement("u-design4b", "design", 2),
  requirement("u-dev4a", "dev", 2),
  requirement("u-dev4b", "dev", 2),
  requirement("u-test4a", "test", 2),
  requirement("u-test4b", "test", 2),
  {
    id: "u-debt0a",
    title: "問題なし",
    description: "今回は何も起きなかった",
    effect: { kind: "nothing" },
  },
  {
    id: "u-debt0b",
    title: "問題なし",
    description: "今回は何も起きなかった",
    effect: { kind: "nothing" },
  },
  debt("u-debt1", 1),
  debt("u-debt2", 2),
];

export const UNCERTAINTY_BY_ID: Record<string, UncertaintyDef> = Object.fromEntries(
  UNCERTAINTY_DEFS.map((u) => [u.id, u]),
);
