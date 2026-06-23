# mintodo 放射状レイアウト v3 (Reingold-Tilford / Buchheim apportion)

日付: 2026-06-23
パッケージ: `packages/mintodo`
先行 spec: `docs/superpowers/specs/2026-06-22-mintodo-radial-layout-design.md` (v1、tween/drag/reducer 統合を定義)
却下 spec: `docs/superpowers/specs/2026-06-23-mintodo-radial-layout-v2-design.md` (option B: 同心円 + ひとり子継承、本 spec で置換)
元パッケージ設計: `docs/superpowers/specs/2026-06-19-mintodo-design.md`

## 背景と動機

v1 spec のアルゴリズム節 (`2026-06-22-mintodo-radial-layout-design.md:51-54`) は「`depth * ringDistance` で同心円状に、子孫は葉数比例でセクター分割」と明文化していたが、実装 `src/layout/radial.ts:117` は `ring = ctx.ring * (1 + i * ctx.factor)` (兄弟インデックス比例) になっており spec から逸脱していた。

その結果、3 階層以上のチェーンで孫ノードがルート位置と衝突する:
```
task1                    (0, 0)
  └ tasks1-1             (0, -240)
      └ tasks1-1-1       (0, 0)      ← 衝突！
```
(vitest 実行で `tasks1-1-1` が `(0, 0)` に配置されることを実測確認済み)

v2 spec (option B: 同心円 + ひとり子継承) で本問題は解消するが、**任意のツリー形状で「兄弟親が持つサブツリー同士が重ならない」ことを数学的に保証するものではない** (葉数比例セクター分割はヒューリスティック)。

ユーザ要望 (ブレスト結論):
- ノードが**重ならない**こと (任意形状で保証)
- **子は外側**にあること
- アルゴリズムを**大胆に見直す**こと
- → **Option C: Reingold-Tilford "tidy" + Buchheim の apportion を自前実装**

## ゴール

1. 任意のツリー形状で「ノード重なりゼロ」を**数式的に保証** (Buchheim の contour algorithm)
2. 「子は常に親より外側」を保証 (深さに比例した半径)
3. 1 本の直線チェーン (例: 3 階層以上のひとり子ツリー) が**一直線**で表示される (Buchheim の自然な帰結)
4. 既存 v1 spec の reducer/tween/drag/edge 統合は維持 (本 spec はレイアウト計算のみを再設計)

## アルゴリズム (新)

### 概要

**d3-hierarchy の `tree.js` と同等の Reingold-Tilford "tidy" アルゴリズム**を自前で実装する。Buchheim ら (2002) の "Improving Walker's Algorithm to Run in Linear Time" に従い、first walk (post-order) と second walk (pre-order) の 2 パスで prelim/mod を解決する。

`computeRadialPositions` は以下の流れ:
1. `MindNode` マップから内部 `TreeNode` 構造体を構築 (collapsed/可視性の反映)
2. Buchheim の `firstWalk` → `secondWalk` で各ノードの prelim `x` (角度) と `y` (深さ) を決定
3. prelim `x` を `[startAngle, startAngle + 2π]` 範囲に正規化 (ツリー全体を 1 周に収める)
4. 極座標に変換: `radius = y × ringDistance`、`angle = x`
5. 直交座標を返す: `(cos(angle) × radius, sin(angle) × radius)`

### Step 1: TreeNode 構築

`MindNode` マップから内部ノードを構築する。可視性ルール (現行維持):
- 先祖に `collapsed === true` を持つノードは対象外
- `nodes` レコードに存在しない id は対象外
- collapsed ノードは「自身の位置は確保するが子孫は配置しない」 (collapse フラグ自体は維持)

ダミーの親ノードを root の上位に 1 段追加し、root の prelim 計算を統一する (d3.tree と同じ慣例)。

### Step 2: Buchheim first walk + second walk + apportion

d3-hierarchy `src/tree.js:1-100` の `treeRoot`, `firstWalk`, `secondWalk`, `apportion`, `executeShifts`, `nextLeft`, `nextRight`, `moveSubtree` を**等価な TypeScript 実装**として移植する。実装の論理的正しさは d3 のリファレンスと同一性を vitest で担保する。

分離関数 (separation):
```ts
function radialSeparation(a: TreeNode, b: TreeNode): number {
  // a.parent === b.parent: 兄弟は 1/depth
  // a.parent !== b.parent: いとこは 2/depth
  // → 半径に比例して角度間隔を広げ、外側の軌道でも重ならない
  return (a.parent === b.parent ? 1 : 2) / a.y;
}
```
d3 の `radialSeparation` と同じ。`/a.y` で「深さに応じた角度補正」を行い、外周の軌道 (円周が長い) でもセクターが確保される。

### Step 3: prelim x の正規化

first walk の結果、各ノードは prelim `x` を持つ。これをツリー全体の最小値が `startAngle`、最大値が `startAngle + 2π` になるように線形スケールする:
```
scaledX = startAngle + (prelim - minPrelim) × (2π / (maxPrelim - minPrelim))
```
これにより、ツリー全体が `[startAngle, startAngle + 2π]` の角度セクターにちょうど収まる。

### Step 4: 極座標 → 直交座標

各ノードの最終位置:
```
radius = y × ringDistance        // y = depth
angle  = scaledX                  // [-π/2, 3π/2] (startAngle=-π/2 の場合)
x      = cos(angle) × radius
y      = sin(angle) × radius      // ※ position.y と区別するため position 側を polarX/polarY と呼ぶ
```

### 可視性 (現行維持)

`isAncestorCollapsed` / `visibleChildren` / `leafCount` の現行実装を Buchheim 適用前のフィルタリングにのみ使う。アルゴリズム本体には組み込まない (Buchheim はツリー構造を入力とする純粋関数)。

### 決定論性

同じ入力 (rootId + nodes 集合 + options) には常に同じ出力。乱数なし。

## API

`src/layout/radial.ts` の公開関数:

```ts
interface RadialOptions {
  rootId: string
  nodes: Record<string, MindNode>
  ringDistance?: number   // 既定 240
  startAngle?: number     // 既定 -π/2 (上、12 時方向)
}

function computeRadialPositions(opts: RadialOptions): Record<string, { x: number; y: number }>

function applyRadialLayout(state: { nodes: Nodes }, opts?: Partial<Omit<RadialOptions, "rootId" | "nodes">>): Nodes
```

`ringFactor` と `singleChildAngleInherit` は**廃止**。Buchheim はひとり子チェーンを自然に一直線にするため、特別なオプションは不要。

## 動作例

### 3 階層ひとり子チェーン
```
task1
  └ tasks1-1
      └ tasks1-1-1
```
- root, tasks1-1, tasks1-1-1 は Buchheim により**同じ prelim x** (= 0 相当) を共有
- 正規化後、全員が `angle = startAngle = -π/2`
- 配置:
  - task1:        `(cos(-π/2)×0,    sin(-π/2)×0)    = (0, 0)`
  - tasks1-1:     `(cos(-π/2)×240,  sin(-π/2)×240)  = (0, -240)`
  - tasks1-1-1:   `(cos(-π/2)×480,  sin(-π/2)×480)  = (0, -480)`
- **一直線 (上方向)**、原点からの距離は単調増加

### 2 ルート子 + 各ひとり子
```
task1
  ├ a
  │  └ a1
  └ b
     └ b1
```
- a と b は Buchheim で prelim x が異なる (separation 1/depth で分離)
- a1, b1 はそれぞれ a, b と同じ prelim x を継承
- 正規化で a は `startAngle + π/2` 付近、b は `startAngle + 3π/2` 付近
- 配置 (概略):
  - task1:   `(0, 0)`
  - a:       `(cos(startAngle + π/2) × 240, sin(startAngle + π/2) × 240) ≈ (240, 0)`
  - b:       `(cos(startAngle + 3π/2) × 240, sin(startAngle + 3π/2) × 240) ≈ (-240, 0)`
  - a1:      `a と同じ angle で radius 480` ≈ `(480, 0)`
  - b1:      `b と同じ angle で radius 480` ≈ `(-480, 0)`
- **横一直線 × 2 本の直線チェーン**

### 5 子 + 各 3 兄弟 (深いツリー)
Buchheim の apportion が保証するため、サブツリー同士が重なっても数式的に解決される (separation 1/depth が外周で自動的に間隔を広げる)。

## テスト計画

### 維持 (Buchheim でも通る)

`src/layout/radial.test.ts` のうち以下 9 件は変更なしで通る:
- `uses 340 as the default ringDistance` (既定 240 のまま、a の距離 = RING で成立)
- `places root alone at the origin`
- `places a single root child directly above the root (special case)` (Buchheim は自動的に root のひとり子を startAngle 位置に配置)
- `scales radius with depth` (深さ比例なので a→b 距離 = RING)
- `hides descendants of a collapsed node`
- `treats a collapsed leaf as 1 leaf for sibling proportion` (collapsed は可視性フィルタとして機能。葉数概念は Buchheim では使わないが、可視性ルールの確認として残す)
- `is deterministic for the same input`
- `omits unknown ids and nodes absent from the map`
- `confines each root child's subtree to its allocated arc` (Buchheim の contour 保証で、よりクリーンに通る)

`describe("applyRadialLayout")` の 2 件も維持:
- `returns a new nodes record with x/y updated`
- `sets hidden nodes to (0, 0)` (computeRadialPositions が出力しない id は applyRadialLayout で (0, 0) にフォールバック、現行通り)

### 期待値更新 (1 件)

- `distributes three root children evenly starting at 12 o'clock` → 期待値を Buchheim 出力 (prelim x = 0, 1, 2 → 正規化後の角度 `startAngle`, `startAngle + π`, `startAngle + 2π`) に更新

### 削除 (2 件)

- `splits a non-root's arc proportional to leaf count` → Buchheim は leaf count 比例ではなく separation-based
- `places children progressively further outward` → 同深さの兄弟は同距離

### 新規追加 (Buchheim 固有の不変条件)

- 3 階層ひとり子チェーンで一直線 (`task1`, `tasks1-1`, `tasks1-1-1` が同じ angle を持つ)
- 4 階層ひとり子チェーンでも同様
- 5 階層ひとり子チェーンでも同様 (深いツリーでの安定性)
- Buchheim の contour 不変条件: 「あるサブツリーの右端 < 次の兄弟サブツリーの左端 - separation」を任意のツリーで検証
- 兄弟間で angle 差が `1/depth` 以上ある (separation 1/depth の効果)
- 2 ルート子 + 各 3 階層孫: 8 ノードすべて重ならない
- 非対称ツリー (1 親に 5 子、別親に 1 子) で 5 子のサブツリーが 1 子のサブツリーに重ならない
- 5 兄弟の root 直下でも 5 つのセクターが確保される

## モジュール変更

### 変更

- **`src/layout/radial.ts`**: 全面書き換え。Buchheim の `firstWalk` / `secondWalk` / `apportion` / `executeShifts` / `nextLeft` / `nextRight` / `moveSubtree` を d3-hierarchy `src/tree.js` から等価移植。`TreeNode` 内部クラス新設。prelim 正規化 + 極座標変換を追加。`radialSeparation` 関数を追加。`ringFactor` 削除。`singleChildAngleInherit` 削除
- **`src/layout/radial.test.ts`**: 期待値更新 1 件 + 新規テスト 8 件追加 + 2 件削除
- **`src/store.ts`**: `applyRadialLayout` 呼び出しは API 変更に合わせて `options` 引数付きで更新 (もしくは引数なしで固定。実装時に決定)

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
- 5 兄弟 + 深いサブツリーのような複雑なツリーでもノード重なりが発生しない
- 既存テスト 11 件 (computeRadialPositions 9 件 + applyRadialLayout 2 件) が変更なしで通る
- 新規テスト 8 件が追加され通る
- 削除したテスト (`splits a non-root's arc proportional to leaf count`, `places children progressively further outward`) は obsolete として明示的に削除

## スコープ外 (YAGNI)

- v1 spec で定義済みの reducer/tween/drag/edge 統合 (実装済み、本 spec では触らない)
- 半径の動的調整 (深さ × 固定 R) を変更する UI
- `startAngle` の UI からの設定
- ノードサイズを考慮したセクター割り当て (固定リング距離)
- 動的な separation 調整 (深さ以外の変数)
- カメラ fit-to-content の再計算 (v1 spec で `OUT OF SCOPE` 済み)

## 影響範囲

| 種別 | ファイル | 影響 |
|---|---|---|
| 変更 | `src/layout/radial.ts` | 全面書き換え (Buchheim 移植) |
| 変更 | `src/layout/radial.test.ts` | 期待値更新 + 新規テスト追加 + 2 件削除 |
| 変更 | `src/store.ts` | `applyRadialLayout` 呼び出し確認 |

## 関連 spec との関係

- v1 spec (`2026-06-22`) のアルゴリズム節 (`## レイアウトアルゴリズム`) は本 spec で置換
- v1 spec の reducer/tween/drag/edge 統合の節は**そのまま有効**
- v2 spec (`2026-06-23`) は本 spec で置換される (歴史として残す)
- 元パッケージ設計 spec (`2026-06-19`) の `## 動作概要 > データモデル` は座標算出方法のみ更新
