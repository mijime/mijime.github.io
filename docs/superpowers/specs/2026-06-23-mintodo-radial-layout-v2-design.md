# mintodo 放射状レイアウト v2 (同心円 + ひとり子継承)

日付: 2026-06-23
パッケージ: `packages/mintodo`
先行 spec: `docs/superpowers/specs/2026-06-22-mintodo-radial-layout-design.md` (v1、tween/drag/reducer 統合を定義。本 spec はそのレイアウトアルゴリズム部分のみを置換)
元パッケージ設計: `docs/superpowers/specs/2026-06-19-mintodo-design.md`

## 背景と動機

v1 spec のアルゴリズム節 (`2026-06-22-mintodo-radial-layout-design.md:51-54`) は「`depth * ringDistance` で同心円状に、子孫は葉数比例でセクター分割」と明文化していたが、実装 `src/layout/radial.ts:117` は `ring = ctx.ring * (1 + i * ctx.factor)` (兄弟インデックス比例) になっており spec から逸脱していた。

その結果、3 階層以上のチェーンで孫ノードがルート位置と衝突する:
```
task1                    (0, 0)
  └ tasks1-1             (0, -240)   ← 仕様 (root's only child special case)
      └ tasks1-1-1       (0, 0)      ← 衝突！
```
(vitest 実行で `tasks1-1-1` が `(0, 0)` に配置されることを実測確認済み)

ユーザ要望:
- ノードが**重ならない**こと
- **子は外側**にあること (深さが増すほど原点から離れる)
- アルゴリズムを**大胆に見直す**こと (v1 spec への実装準拠 + ひとり子継承の追加)

## ゴール

1. 任意のツリー形状で「ノード重なりゼロ」を保証
2. 「子は常に親より外側」を保証
3. 1 本の直線チェーン (例: 3 階層以上のひとり子ツリー) が**一直線**で表示される
4. 既存 v1 spec の reducer/tween/drag/edge 統合は維持 (本 spec はレイアウト計算のみを再設計)

## アルゴリズム (新)

### 位置計算

ノード (depth `d`, angle `θ`) のキャンバス座標:
```
x = cos(θ) × d × ringDistance
y = sin(θ) × d × ringDistance
```
- ルート: `d = 0`、`(0, 0)` 固定
- ルート以外: `d = 1, 2, 3, ...` (木深さに比例した半径)

### 角度決定

再帰関数 `placeChildrenOf(parentId, arcStart, arcEnd, depth, parentAngle, out, ctx)`:
- 親 `parentId` は depth `depth - 1` に既に配置済み (root は 0)
- `parentAngle` は親ノードの**角度** (ひとり子継承で使用)
- `arcStart, arcEnd` は親に渡された角度セクター (絶対値、startAngle オフセット前)

子の角度決定:
1. **ルートの直属の子、特別ケース**: ルートに子が**1 個のみ**なら、その子は `startAngle` (既定 `-π/2` = 上) に配置。`arcStart=0, arcEnd=2π` を子に渡す
2. **ルートの直属の子、通常ケース**: 子が**2 個以上**なら、`[0, 2π]` を均等分割。`i` 番目の子は arc `[i × slice, (i+1) × slice]` (slice = `2π / kids.length`)、angle は `(arcStart + arcEnd) / 2 + startAngle` (セクター中央)
3. **非ルートの子、ひとり子継承 ON (既定)**: 親に**子が 1 個のみ**なら、`(arcStart + arcEnd) / 2 + startAngle` (セクター中央) ではなく**`parentAngle` (親ノードの角度)**を継承
4. **非ルートの子、通常**: 葉数比例で親から受け取ったセクターを分割

子の配置座標:
```
childX = cos(childAngle) × depth × ringDistance
childY = sin(childAngle) × depth × ringDistance
```

### 可視性 (現行維持)

先祖に `collapsed === true` を持つノード、および `nodes` レコードに存在しない id は対象外 (戻り値 Map に含めない)。`isAncestorCollapsed` / `visibleChildren` / `leafCount` の現行実装 (`radial.ts:13-45`) をそのまま流用。

### 決定論性

同じ入力 (rootId + nodes 集合 + options) には常に同じ出力。乱数なし。

## API

`src/layout/radial.ts` の公開関数:

```ts
interface RadialOptions {
  rootId: string
  nodes: Record<string, MindNode>
  ringDistance?: number              // 既定 240
  startAngle?: number                // 既定 -π/2 (上、12 時方向)
  singleChildAngleInherit?: boolean  // 既定 true
}

function computeRadialPositions(opts: RadialOptions): Record<string, { x: number; y: number }>

function applyRadialLayout(state: { nodes: Nodes }, opts?: Partial<Omit<RadialOptions, "rootId" | "nodes">>): Nodes
```

`ringFactor` は廃止。`applyRadialLayout` は options 省略時は `rootId` 自動検出 + 既定値を使用。

## 動作例

### 3 階層ひとり子チェーン (再現条件)
```
task1                    (0, 0)
  └ tasks1-1             (0, -240)   ← startAngle special case
      └ tasks1-1-1       (0, -480)   ← parentAngle 継承
```
- 一直線 (上方向)
- 原点からの距離は単調増加

### 2 ルート子 + 各ひとり子
```
task1
  ├ a           (240, 0)
  │  └ a1       (480, 0)        ← a の angle 継承
  └ b           (-240, 0)
     └ b1       (-480, 0)       ← b の angle 継承
```

### 混合 (1 ノードが 2 子 + さらに子)
```
task1
  └ a                          (0, -240)         ← root's only child, arc [0, 2π]
      ├ a1  leafCount=3        ((√2/2)·480, (√2/2)·480)     ≈ (339, 339)  screen: down-right
      │  └ a1a                 (angle 継承)
      └ a2  leafCount=1        (-(√2/2)·480, -(√2/2)·480) ≈ (-339, -339) screen: up-left
```
- a1 は a のセクター `[0, 2π]` の 3/4 (`[0, 3π/2]`) を割り当て、angle = `startAngle + 3π/4` = `-π/2 + 3π/4` = `π/4`
- a2 は a のセクターの 1/4 (`[3π/2, 2π]`)、angle = `startAngle + 7π/4` = `5π/4`
- 角度間隔は葉数比例で非対称 (3:1)
- a1a (a1 のひとり子) は a1 の angle = `π/4` を継承して depth 3 に配置: `(cos(π/4)·720, sin(π/4)·720)` ≈ `(509, 509)` (screen: down-right of a1)

## テスト計画

### 維持 (新アルゴリズムでも通る)

`src/layout/radial.test.ts` のうち以下 8 件は変更なしで通る:
- `places root alone at the origin`
- `places a single root child directly above the root (special case)` (root's only child special case 維持)
- `scales radius with depth` (深さ比例なので a→b 距離 = RING で成立)
- `hides descendants of a collapsed node`
- `treats a collapsed leaf as 1 leaf for sibling proportion`
- `is deterministic for the same input`
- `omits unknown ids and nodes absent from the map`
- `confines each root child's subtree to its allocated arc` (a→a1 角度が 0、UP との差 π/2、丁度許容範囲内)

### 期待値更新 (4 件)

- `uses 340 as the default ringDistance` → タイトルとコメントを修正 (実体は `RING = 240` で通る)
- `distributes three root children evenly starting at 12 o'clock` → 期待値を「セクター中央起点 + 同一リング距離」に書き換え
- `splits a non-root's arc proportional to leaf count` → 距離期待値を `RING` → `2 * RING` (深さ 2 への配置) に更新
- `places children progressively further outward` → 全面書き換え (同深さは同距離になる)

### 新規追加 (新アルゴリズム固有の不変条件)

- 3 階層ひとり子チェーン: `tasks1-1-1` が `(0, -480)` 付近、ルート `(0, 0)` と重ならない
- 4 階層ひとり子チェーン: 同様に一直線上
- `singleChildAngleInherit: false` で A 動作 (ジグザグ) に切り替わる
- 2 ルート子 + 各ひとり子: 4 放射状配置
- 混合 (1 ノードが 2 子): 葉数比例セクター分割が機能
- 同深さの兄弟は半径が等しい (旧 `ringFactor` の progressive outward は再現されない)

## モジュール変更

### 変更

- **`src/layout/radial.ts`**: 全面書き換え。`place` / `placeChildren` を `placeChildrenOf(parentId, arcStart, arcEnd, depth, parentAngle, out, ctx)` に再構成。`ringFactor` 削除。`RadialOptions` を本 spec 通りに拡張。`findRootId` 維持
- **`src/layout/radial.test.ts`**: 期待値更新 3 件 + 新規テスト 6 件追加
- **`src/store.ts`**: `applyRadialLayout` 呼び出しは API 変更に合わせて引数なし (`Partial<Omit>` で省略時既定) のまま動作可能。引数を増やしたい場合は `withRadialLayout` ヘルパを改修 (本 spec 時点では引数なしで固定する前提で OK)

### 無改変

- `src/components/Canvas.tsx`, `src/components/ConnectionLines.tsx`, `src/components/NodeCard.tsx` (座標は reducer → state → 描画の経路で決まる)
- `src/hooks/use-tween.ts`, `src/hooks/use-drag-node.ts`, `src/hooks/use-pan-zoom.ts`
- `src/view.ts` (fit view 計算は座標を見るだけでアルゴリズムに非依存)
- `src/types.ts`, `src/storage.ts`, `src/dsl.ts`, `src/db.ts`

## 受け入れ条件

- `pnpm test` が全件通る
- `pnpm run check` がエラーなしで通る
- アプリ起動時、3 階層以上のひとり子チェーンで孫がルートと重ならない (一直線で外側に向かう)
- 2 ルート子 + 各ひとり子で 4 方向に放射状配置
- `singleChildAngleInherit: false` オプションで A 動作 (ジグザグ) に切り替え可能 (テストのみ。UI 露出は本 spec 範囲外)
- 既存テスト 8 件が変更なしで通る
- 新規テスト 6 件が追加され通る

## スコープ外 (YAGNI)

- v1 spec で定義済みの reducer/tween/drag/edge 統合 (実装済み、本 spec では触らない)
- 半径の動的調整 (深さ × 固定 R) を変更する UI
- `startAngle` の UI からの設定
- `singleChildAngleInherit` の UI からの切り替え (テストのみ)
- ノードサイズを考慮したセクター割り当て (固定リング距離)
- ノード間の物理的衝突判定 (mindmap 慣例のセクター数学的保証で十分)
- カメラ fit-to-content の再計算 (v1 spec で `OUT OF SCOPE` 済み)

## 影響範囲

| 種別 | ファイル | 影響 |
|---|---|---|
| 変更 | `src/layout/radial.ts` | 全面書き換え |
| 変更 | `src/layout/radial.test.ts` | 期待値更新 + 新規テスト追加 |
| 変更 | `src/store.ts` | 必要なら `applyRadialLayout` 呼び出し確認 (引数なしなら無改変) |

## 関連 spec との関係

- v1 spec (`2026-06-22`) のアルゴリズム節 (`## レイアウトアルゴリズム`) は本 spec で置換
- v1 spec の reducer/tween/drag/edge 統合の節は**そのまま有効**
- 元パッケージ設計 spec (`2026-06-19`) の `## 動作概要 > データモデル` は座標算出方法のみ更新
