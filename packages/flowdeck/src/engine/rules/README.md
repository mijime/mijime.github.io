# Flowdeck rules

ゲームルールの拡張点をまとめたディレクトリ。`RuleSet` はここにある registry を束ねたもの。

```
rules/
  index.ts          BASE_RULES / RULE_SETS / resolveRules
  types.ts          RuleSet
  balance.ts        アクション数・手札・星閾値・リスクドロー比率
  lanes.ts          lane ↔ phase、実効lv
  generation.ts     タスク生成の base + modifiers
  tips.ts           ボードミーティングの指摘（星への影響度順）
  effects/          カード効果（1効果 = 1プラグイン）
  penalties/        期限切れ罰則
  risks/            リスクカードの解決
```

## カード効果を追加する

1. `engine/types.ts` の `CardEffectMap` に payload を追加する。

```ts
export interface CardEffectMap {
  draw: { amount: number };
  // ...
  boost: { amount: number }; // 追加
}
```

2. `engine/rules/effects/boost.ts` を作る。

```ts
import type { CardEffectPlugin } from "./types";

export const boostEffect: CardEffectPlugin<"boost"> = {
  kind: "boost",
  label: (effect) => `ブースト+${effect.amount}`,
  describe: (effect) => `次のプレイを+${effect.amount}`,
  aiValue: (effect) => effect.amount * 8,
  generationValue: () => 1.0,
  apply({ state, player }, effect) {
    // 状態を変更する。ログは pushLog を使う。
  },
};
```

3. `engine/rules/effects/index.ts` の `CARD_EFFECTS` に登録する。

```ts
import { boostEffect } from "./boost";

export const CARD_EFFECTS = {
  // ...
  boost: boostEffect,
} satisfies CardEffectRegistry;
```

4. `data/tasks.ts` のテンプレートに効果を付ける。

```ts
task("example", "例", 5, 5, 3, 1, 4, r("dev", 4, { kind: "boost", amount: 1 }));
```

5. `engine/rules/effects/effects.test.ts` の `SAMPLES` に追加し、`sim` でバランスを確認する。

2 を忘れると 3 で型エラー、3 を忘れると `satisfies` で型エラーになる。`apply` はプレイ時に完結させる。日末や終了時に動く効果が必要になったら、`CardEffectPlugin` に任意フックを足し、`core` / `expireTasks` / `computeOutcome` の1箇所から呼ぶ。

## 罰則・リスクを追加する

- 罰則: `TaskPenaltyMap` に payload を追加 → `rules/penalties/<kind>.ts` → `TASK_PENALTIES` に登録
- リスク: `RiskEffectMap` に payload を追加 → `rules/risks/<kind>.ts` → `RISK_EFFECTS` に登録

どちらも `satisfies` で網羅性を保証している。罰則から負債を増やすときは `engine/debt.ts` の `addDebt` を使う（`tasks.ts` を import すると循環する）。

## タスク生成を比較する

生成ポリシーは `data/generateTasks.ts` の `BUDGET_GENERATION` / `VALUE_GENERATION`。

- `budget`: スコア帯の予算から要求合計を決める
- `value`: スコア + 報酬lv×0.5 + 効果価値 + 罰則価値 から要求合計を逆算する

`TaskGenerationPolicy.swing`（0〜0.2）で要求量の得損を注入できる。既定は `0.1`。通常タスクは `1 ± swing`、効果・インシデントは半分の振幅。`0.2` で通常タスクが0.8〜1.2倍になる。

```bash
pnpm --filter @mijime/flowdeck tasks -- --compare
pnpm --filter @mijime/flowdeck tasks -- --policy value --seed 42
```

`--compare` は効率（価値 / 要求合計）の分布と、`>0.45`（安すぎ）/<0.25（高すぎ）の件数を比較する。

## ルールセットを差し替える

`RuleSet` は `createGame` / `reduce` / `playBotRound` に注入できる。UI は `BASE_RULES` 固定、シミュレーションは `--ruleset` で切り替える。

```ts
const altered = {
  ...BASE_RULES,
  balance: { ...BASE_RULES.balance, actionsPerTurn: 4 },
};
const state = createGame(seed, days, aiCount, altered);
```

`state` には `RuleSet` を保存しない（関数を含むため）。UI で切り替えたくなったら `rulesetId` を state に足し、save version を上げる。

## シミュレーション用シナリオ

`scripts/lib/scenarios.ts` は `BASE_RULES` を複製し、バランスだけを差し替えたシナリオを作る。ゲーム本体のデフォルトは `base` のまま。

```ts
resolveScenario("no-tokens"); // startingTokens = 0
scenarioFromOverrides("custom", { actionsPerTurn: 4, debtScorePenalty: 3 });
```

- プリセット: `base` / `substitution` / `no-tokens` / `token-rich` / `fast` / `slow` / `long-hand` / `tight-debt` / `loose-debt` / `budget` / `value`
- スイープ可能: `actionsPerTurn` / `handSize` / `debtScorePenalty` / `startingTokens` / `allowSubstitution` / `openTasks` / `debtLimit` / `starOne` / `starTwo` / `starThree` / `generation`
- `teamRules` の上書きは元の関数を捕まえてから包む（`rules.balance.teamRules` をそのまま参照すると再帰する）
