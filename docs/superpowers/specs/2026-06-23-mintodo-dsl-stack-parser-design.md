# mintodo DSL パーサ リファクタ: スタックベース自由ツリー

日付: 2026-06-23
パッケージ: `packages/mintodo`
関連: `docs/superpowers/specs/2026-06-22-mintodo-dsl-editor-design.md` (DSL editor spec)

## 背景

現行の `parseDSL` (`src/dsl.ts:35-149`) は「連続行の深さ差が ±1 以内」という行ベース制約を持つ。深さ 3 から深さ 1 へ一気に戻るような入力を拒否する。例:

```
task1                ← 深さ 0
  tasks1-1           ← 深さ 1
    tasks1-1-1       ← 深さ 2
      hello          ← 深さ 3
  task1-2            ← 深さ 1 (tasks1-1 の兄弟)
```

`hello` (深さ 3) → `task1-2` (深さ 1) の差が 2 で `parseDSL` が `null` を返す。自由ツリーを表現できない。

## ゴール

`parseDSL` を「行スタック」パターンに書き換え、任意の深さ差 (差分制限なし) を許す。典型的な YAML ライクなインデントベースのパーサにする。

## 動作

### アルゴリズム

```
stack: 親候補スタック (depth, node) の配列。最初は空。
各行について:
  - 空行 / コメント行はスキップ
  - インデントが奇数 or タブ文字を含む → reject
  - テキストが空 → reject
  - 最初のノードで深さ != 0 → reject
  - while stack.length > 0 && stack.top.depth >= current.depth: stack.pop()
  - 親 = stack.top.node (stack 空なら null)
  - depth == 0 && 親 == null → 2 つ目の root なので reject
  - 親が null (depth 0) → root ノード
  - 親がある → 親の子に push
  - stack.push((current.depth, node))
```

### 維持される制約

- 最初のノードは深さ 0 (root 必須)
- 2 つ目の深さ 0 ノードは reject (1 board = 1 root)
- タブ文字は reject
- インデントは 2 スペースの倍数のみ
- 空行 / `#` で始まるコメント行はスキップ
- テキストが空 (attributes のみ) は reject
- 未知 attribute は無視、既知不正 attribute (priority:urgent 等) は reject

### 新たに許可されるパターン

- 任意の +N / -N ジャンプ (差分制限撤廃)
- 深いサブツリーの直後に祖先レベルへ戻る

## テスト変更

### 既存テスト更新 (2 件)

`src/dsl.test.ts:85-91` の "returns null on +4 indent jump" と "returns null on -4 indent jump" は、もはや不正ではないため、期待値を「成功する」テストに書き換える:

- `+4 indent jump` (深さ 0 → 4) → root の直接の子 (深さ 4 の親が root) として成功
- `-4 indent jump` (深さ 0 → 1 → 4 → 0) → 直前の root レベルへの復帰として成功

### 新規追加 (4 件)

1. **ユーザの再現条件** (深さ 3 → 1 の -2 ジャンプ):
   ```
   task1
     tasks1-1
       tasks1-1-1
         hello
     task1-2
   ```
   - `task1-2` が `task1` の子 (sibling of `tasks1-1`)

2. **深いサブツリー直後に祖先へ復帰** (-3 ジャンプ):
   ```
   A
     B
       C
         D
     E
   ```
   - `E` が `A` の子 (sibling of `B`)

3. **任意の +N ジャンプ** (例: +3):
   ```
   A
           B
   ```
   - `B` が `A` の子 (深さ 3 だが親は root)

4. **2 つ目の root は reject**:
   ```
   Root
   Other
   ```
   - 2 行目が depth 0 で root が既に存在 → `null` を返す

### 既存維持 (残り全件)

- "parses root only", "parses root and one child", "parses deep nesting", "parses siblings at same level", "ignores comment lines", "ignores blank lines", "accepts CRLF line endings", "returns null when no root line", "returns null on tab character", "returns null on non-2-multiple indent", "returns null on empty text after stripping", "preserves single-word text", attribute 系全件

## モジュール変更

### 変更

- **`src/dsl.ts`**: `parseDSL` の本体ロジックを行スタックパターンに書き換え。`parentByDepth: string[]` を `stack: { depth, node }[]` に置換。`firstNode` 後の `Math.abs(depth - prevDepth) > 1` チェックを削除し、スタックポップで親を解決。2 つ目 root の reject チェックを追加。
- **`src/dsl.test.ts`**: 既存 2 件の indent jump 拒否テストを「成功」テストに書き換え。新規 4 件を追加。

### 無改変

- `src/dsl.ts` の `parseInlineDSL`, `serializeDSL`, ヘルパー関数
- `src/types.ts`
- その他全ファイル

## 受け入れ条件

- `pnpm test` 全件 pass
- `pnpm run check` エラーなし
- ユーザの再現条件 (`task1 / tasks1-1 / tasks1-1-1 / hello` 配下に `task1-2` が `task1` の子として成功) が通る
- 既存の 14 件の `parseDSL` 構造テストのうち、indent jump 関連 2 件以外の 12 件は変更なしで通る
- 新規 4 件のテストが追加され通る

## スコープ外 (YAGNI)

- タブインデント許容
- 4 スペースインデント許容
- 異なるインデント幅の混在
- 複数 board / 複数 root の許容
- DSL シンタックスハイライト (UI 側)
- リアルタイムパース (UI 側)
- エラーメッセージの親切化 (引き続き `null` を返す)
