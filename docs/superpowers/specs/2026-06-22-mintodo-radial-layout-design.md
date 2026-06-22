# mintodo 放射状マインドマップ自動レイアウト

日付: 2026-06-22
パッケージ: `packages/mintodo`
関連: `docs/superpowers/specs/2026-06-19-mintodo-design.md` (元パッケージ設計)

## 目的

現在 `mintodo` のノード配置は「物理シミュレーション (`use-physics.ts`) による斥力+ばねのrAFループ + ユーザーによる手動ドラッグ」で実現されている。これを廃止し、**常に放射状 (radial) のマインドマップ配置** に自動化する。

ユーザの要望:
- タスクの配置は **常に** 放射線状、mindmap のような見た目
- **手動での配置機能は不要** (自由ドラッグ廃止)
- ただし **ドラッグ&ドロップで親子関係を変更** する UX は残す (drop on node = そのノードの子にする、drop on empty = 放射状位置にスナップ復帰)
- 構造変化 (追加/削除/reparent/折りたたみ) 時は **スムーズにトゥイーン** アニメーション
- エッジは親→子への **直線** (現状の S 字ベジェから変更)
- 兄弟間の角度配分は **サブツリーサイズ比例** (古典 mindmap 慣例)

## 動作概要

### 全体アーキテクチャ

1. `src/layout/radial.ts` — 純関数 `computeRadialPositions(rootId, nodes, options)`, ツリーを受け取り各ノードの `(x, y)` を決定論的に計算して返す
2. reducer 内で構造変化アクション (`ADD_CHILD`, `DELETE_NODE`, `TOGGLE_COLLAPSE`, `REPARENT`, `SNAP_BACK`, `SET_NODES`, `RESET`) の末尾に `applyRadialLayout` ヘルパ呼び出しを挿入
3. `state.layoutVersion: number` を導入し、構造変化のたびにインクリメント (tween フックの依存配列)
4. `src/hooks/use-tween.ts` (新規) が `layoutVersion` 変化を検知し、ノードとエッジ双方を 300ms でトゥイーン (実装は Web Animations API / カスタム rAF 等を実装時に決定)
5. `src/hooks/use-drag-node.ts` を改修し、ドラッグ中は DOM 位置を直接書き換え (state は触らない)、ドロップ時に `REPARENT` または `SNAP_BACK` を dispatch
6. `src/components/ConnectionLines.tsx` の S 字ベジェを `<line>` 直線に置換
7. `src/hooks/use-physics.ts` および `physicsEnabled` state / 「自動配置」トグル UI を削除

### レイアウトアルゴリズム (`src/layout/radial.ts`)

**シグネチャ**:
```ts
type RadialOptions = {
  rootId: string
  nodes: Record<string, MindNode>
  ringDistance: number  // 既定 220 (px per depth)
  startAngle: number    // 既定 -π/2 (画面上方向、12 時)
}

function computeRadialPositions(opts: RadialOptions): Record<string, { x: number; y: number }>
```

**ステップ**:

1. **可視性判定**: 先祖に `collapsed === true` を持つノード、および `nodes` に存在しない id は対象外 (戻り値 Map に含めない)
2. **葉カウント**: ノード `n` について「可視な葉の数」を再帰的に計算。`n.collapsed === true` または可視子なしなら 1 を返す
3. **ルート再帰**: ルートから時計回りに角度範囲を割り当てる
   - ルート直属の子は**均等**に 2π を割る (mindmap 慣例: 第一子が真上)
   - 子孫は**葉数比例**で親の角度範囲を分割
4. **ノード位置**: 各ノードを「自身の割り当てられた円弧の中央角度」×「`depth * ringDistance`」に配置。ルートは `(0, 0)` 固定
5. **特殊ケース**: ルートの子が 1 個なら円弧の中央 (真下) ではなく `startAngle` (真上) に配置

**擬似コード** (参考、実装はもう少し素直な形に):
```ts
function place(nodeId, arcStart, arcEnd, depth, originX, originY):
  n = nodes[nodeId]
  if depth === 0:
    pos[nodeId] = (0, 0)
  else:
    angle = startAngle + (arcStart + arcEnd) / 2
    pos[nodeId] = (cos(angle) * depth * ringDistance, sin(angle) * depth * ringDistance)

  if n.collapsed or no visible children: return

  if depth === 0:
    kids = n.children.filter(visible)
    slice = 2π / kids.length
    for i, kid in kids:
      place(kid, i * slice, (i + 1) * slice, depth + 1, pos[nodeId].x, pos[nodeId].y)
  else:
    total = sum(leafCount(c) for c in visibleChildren)
    cursor = arcStart
    for kid in visibleChildren:
      w = leafCount(kid) / total
      place(kid, cursor, cursor + w * (arcEnd - arcStart), depth + 1, pos[nodeId].x, pos[nodeId].y)
      cursor += w * (arcEnd - arcStart)
```

**決定論性**: 同じ入力 (rootId + nodes 集合) には常に同じ出力。乱数なし。

### Reducer 統合

| Action | 現状の挙動 | 新挙動 |
|---|---|---|
| `ADD_CHILD` | 親 + (x=140, y=jitter, ランダムvx, vy) | `applyRadialLayout(state.nodes)` を呼び、子の新位置が放射状配置の結果と一致。`vx, vy` は 0 で初期化 |
| `DELETE_NODE` | 再帰削除のみ | 削除後に `applyRadialLayout` 再計算 |
| `TOGGLE_COLLAPSE` | フラグ反転のみ | 反転後に `applyRadialLayout` 再計算 (展開時、子孫が再配置) |
| `REPARENT` (新規) | なし | 親変更 + 循環チェック + `applyRadialLayout` |
| `SNAP_BACK` (新規) | なし | `applyRadialLayout` + `layoutVersion` increment のみ (tween トリガ) |
| `SET_NODES` (DSL import) | 全ノード (0,0) | `applyRadialLayout` |
| `RESET` | ルート (0,0) | `applyRadialLayout` |
| `UPDATE_NODE` | 触らない | 触らない (テキスト/優先度/色/期日) |
| `TOGGLE_COMPLETE` | 触らない | 触らない (見た目は CSS) |
| `MOVE_NODE` | 自由ドラッグ位置を保存 | **削除** (新設計では未使用、ドラッグは DOM 直接書き換え + 終了時 REPARENT/SNAP_BACK) |
| `SET_DRAGGING` (新規) | なし | `state.draggingId` を `string \| null` で更新。drag 開始/終了の hook から dispatch |

**`REPARENT` バリデーション** (reducer 内で実施):
- 移動先 ≠ 自分自身
- 移動先 ≠ 自分の子孫 (循環防止)
- ルートは reparent 不可 (常にルート)
- 不正な場合は `state` を不変にして `SNAP_BACK` 相当のレイアウト再計算だけ走らせる

**`layoutVersion`**:
- `state.layoutVersion: number` を新規追加
- 構造変化を起こす全 reducer ケースの末尾で `+1`
- tween hook の依存配列に使用
- 永続化対象外 (`storage.ts` のロード時に 0 リセット)

### Tween エンジン (`src/hooks/use-tween.ts`, 新規)

**責務**: `state.layoutVersion` の変化を検知し、変化したノード (および対応するエッジ) を古い DOM 位置から新しい state 位置へ 300ms でアニメーションする。実装は Web Animations API / カスタム rAF 等を実装時に決定。

**仕組み**:

1. **旧位置トラッキング**: `useRef<Record<string, {x, y}>>` で前回の state 位置を保持。初回マウント時は state の現在値
2. **検知**: `useEffect([layoutVersion])` で version 変化を待つ
3. **差分計算**: 旧 ref vs 新 state を id 単位で比較
   - 旧に無い ID (= 新規作成) → 出現アニメーション。旧位置を「親ノードの位置」として記録し、そこから tween
   - 旧に有って新に無い ID (= 削除) → 何もしない (即消滅)
   - 両方に有るが座標が違う → 旧 → 新へ tween
4. **アニメーション実行**: ノード要素とエッジ要素の双方に対し、**同じ仕組み**で 300ms トゥイーンを実行する
   - ノード: `style.left` / `style.top` を 0→300ms で補間
   - エッジ: `x1, y1, x2, y2` を 0→300ms で補間
   - 具体的な実装は実装時に決定 (Web Animations API の `Element.animate` / `getAnimations()` を第一候補、ライン SVG 属性の CSS プロパティ化も視野)
5. **drag 中の抑制**: `state.draggingId !== null` の間は tween をスキップ
6. **ref 更新**: tween 開始後に `prevPositionsRef.current = currentNodes`

**easing**: `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out 相当) を全トゥイーンで使用。

**物理シュミ削除**:
- `src/hooks/use-physics.ts` ファイル全体削除
- `state.physicsEnabled: boolean` 削除
- `TOGGLE_PHYSICS` action ケース削除
- `src/components/Toolbar.tsx:103-119` 「自動配置」トグル UI 削除
- `src/components/Canvas.tsx` の `usePhysics` 呼び出し削除

### ドラッグ&ドロップ再親子化 (`src/hooks/use-drag-node.ts` 改修)

**状態モデル**:
- `state.draggingId: string | null` を追加 (旧 `isDragging: boolean` を統合、`draggingId !== null` でドラッグ中と判定)
- drag 開始で `dispatch(SET_DRAGGING, { id })`、終了で `dispatch(SET_DRAGGING, { id: null })`
- tween hook は `draggingId !== null` の間、layoutVersion による tween をスキップ
- storage 永続化対象外

**ライフサイクル**:

1. **dragstart** (mousedown on card, or touchstart):
   - `dispatch(SET_DRAGGING, { id })`
   - 元の位置を ref に記録
   - window に mousemove / touchmove リスナ登録
2. **dragmove**:
   - dragged element の `style.left/top` を直接書き換え (state は触らない)
   - `document.elementFromPoint(x, y)` でドロップ候補を判定
   - 候補ノードに `data-droppable="true|false"` のクラスを付与
3. **dragend** (mouseup / touchend):
   - mousemove リスナ解除
   - 候補が「他の可視ノード」かつ「子孫でない」→ `dispatch(REPARENT, { id, newParentId })`
   - それ以外 (空所 / 自分 / 子孫 / ルート) → `dispatch(SNAP_BACK, { id })`
   - `dispatch(SET_DRAGGING, { id: null })`

**`REPARENT` 動作** (reducer 内):
- `state.nodes[id].parentId = newParentId`
- `newParent.children.push(id)` (末尾追加)
- `oldParent.children = oldParent.children.filter(c => c !== id)`
- `state.layoutVersion += 1`
- `state.nodes = applyRadialLayout(state.nodes)`

**`SNAP_BACK` 動作**:
- `state.layoutVersion += 1`
- `state.nodes = applyRadialLayout(state.nodes)`

**ビジュアルフィードバック**:
- ドラッグ中カード: `opacity: 0.7` + `cursor: grabbing`
- ホバー中の有効ターゲット: `ring-2 ring-sky-400` (Tailwind)
- ホバー中の無効ターゲット: 視覚的に無反応
- tween hook はドラッグ中の他ノード移動を完全に止める

**タッチ対応**: 既存の touchstart / touchmove / touchend ハンドラの構造を維持。

### エッジ描画 (`src/components/ConnectionLines.tsx` 改修)

**変更点**:
- 水平アンカーの S 字 3 次ベジェ (`<path>`) を `<line>` 直線に置換
- ストローク色は現状の `slate-400` 相当を維持
- 線の太さ: `1.5px`
- 各 line に `id="edge-${parentId}-${childId}"` を付与
- 親子間 DOM 順序は DFS 順 (現状の Map イテレーション順を踏襲)
- tween 中の edge 追従は `use-tween.ts` が担当 (ノードと同じトゥイーン方式)

## モジュール構成

### 新規ファイル

#### `src/layout/radial.ts`
- 純関数 `computeRadialPositions(opts)` をエクスポート
- 副作用なし、乱数なし

#### `src/layout/radial.test.ts`
vitest による純関数テスト (下記「受け入れ条件 / テスト」参照)

#### `src/hooks/use-tween.ts`
- デフォルトエクスポート `useTween(): void`
- `state.layoutVersion`, `state.draggingId`, `state.nodes` を消費

#### `src/hooks/use-tween.test.ts`
- vitest fake timers による補間テスト

#### `src/hooks/use-drag-node.test.ts`
- ドロップターゲット判定、循環防止、SNAP_BACK/REPARENT ディスパッチ

### 変更ファイル

#### `src/types.ts`
- `MindNode` から `vx: number`, `vy: number` 削除
- `State` に `layoutVersion: number`, `draggingId: string | null` 追加 (旧 `isDragging: boolean` は廃止、`draggingId !== null` で判定)
- `Action` union に `REPARENT`, `SNAP_BACK`, `SET_DRAGGING` 追加
- `MOVE_NODE`, `TOGGLE_PHYSICS`, `physicsEnabled: boolean` 削除

```ts
type Action =
  | ...
  | { type: "REPARENT"; id: string; newParentId: string }
  | { type: "SNAP_BACK"; id: string }
  | { type: "SET_DRAGGING"; id: string | null }
```

#### `src/store.ts`
- 各構造変化 reducer ケースの末尾で `applyRadialLayout` + `layoutVersion++` を呼び出すヘルパに統一
- `ADD_CHILD` の `vx, vy` 初期化を削除
- `TOGGLE_PHYSICS` ケース削除
- `MOVE_NODE` ケース削除
- `SET_DRAGGING` ケース追加: `state.draggingId = id` のみ
- `applyRadialLayout(nodes): Record<string, MindNode>` ヘルパを export

#### `src/hooks/use-drag-node.ts`
- ドラッグ中は DOM 直接書き換え (state は触らない)
- ドロップターゲット判定: `elementFromPoint` → `data-node-id` 属性 walk up
- REPARENT / SNAP_BACK のディスパッチ
- 有効ターゲットのハイライト制御

#### `src/components/Canvas.tsx`
- `usePhysics` の呼び出し削除
- `useTween` の呼び出し追加
- `useDragNode` の呼び出しは維持

#### `src/components/ConnectionLines.tsx`
- `<path>` ベジェを `<line>` 直線に置換
- 各 line に `id="edge-${parentId}-${childId}"` 付与
- world→screen 変換は現状維持

#### `src/components/Toolbar.tsx`
- 「自動配置」トグル UI 削除 (lines 103-119)

#### `src/storage.ts`
- ロード時の `vx, vy: 0` リセット削除 (フィールド自体が消える)
- `physicsEnabled` 永続化削除

#### `src/dsl.ts`
- `vx, vy: 0` のシリアライズ削除 (フィールド自体が消える)

#### `src/store.test.ts`
- `ADD_CHILD` テストの期待値を放射状配置の結果に更新
- `REPARENT`, `SNAP_BACK` ケースを追加
- `layoutVersion` インクリメント検証を追加
- `TOGGLE_PHYSICS` 関連テスト削除

#### `src/dsl.test.ts`
- 期待値を `(0, 0)` から放射状配置の結果に更新

### 削除ファイル

- `src/hooks/use-physics.ts` (ファイル全体)

## 受け入れ条件

- `pnpm test` が全件通る
- `pnpm run check` がエラーなしで通る
- アプリを開くと、ルートが画面中央に、子が放射状に配置される
- ノード追加 (`Tab` / `+` ボタン) → 新しい子ノードが放射状位置にトゥイーン
- ノード削除 (`Delete` / `Backspace`) → 残存ノードが新配置にトゥイーン
- 折りたたみ (chevron ボタン) → 子孫が隠れ、レイアウトが再計算される (展開時は子孫がトゥイーン復帰)
- ノードをドラッグして他のノード上にドロップ → ドロップ先が新親になる (循環は自動拒否され SNAP_BACK)
- ノードをドラッグして空所でドロップ → ドラッグ前の放射状位置にトゥイーン復帰
- ドラッグ中の他ノードは動かない (`draggingId !== null` 中は tween 停止)
- 親子間の線は親→子への直線 (S 字ベジェではない)
- 「自動配置」トグル UI が消えている
- `use-physics.ts` ファイルが削除されている
- `MindNode` から `vx`, `vy` が削除されている

## スコープ外 (YAGNI)

- Undo/Redo (既存のドラッグ復元も対象外)
- ノードのリサイズ・折り返し・複数行
- パン/ズーム挙動の変更 (現状維持)
- 自動 fit-to-content (構造変化時にカメラを自動で合わせる)
- 角度範囲の手動調整 UI
- ルートの親設定 (マインドマップは常に単一ルート)
- IndexedDB スキーマのマイグレーション (旧データに `vx, vy`, `physicsEnabled` が残っていても無視)

## 影響範囲

| 種別 | ファイル | 影響 |
|---|---|---|
| 新規 | `src/layout/radial.ts` | 放射状レイアウト純関数 |
| 新規 | `src/layout/radial.test.ts` | 純関数テスト |
| 新規 | `src/hooks/use-tween.ts` | tween エンジン |
| 新規 | `src/hooks/use-tween.test.ts` | tween テスト |
| 新規 | `src/hooks/use-drag-node.test.ts` | ドラッグ判定テスト |
| 変更 | `src/types.ts` | `vx, vy, physicsEnabled, MOVE_NODE, TOGGLE_PHYSICS, isDragging` 削除、`layoutVersion, draggingId, REPARENT, SNAP_BACK, SET_DRAGGING` 追加 |
| 変更 | `src/store.ts` | 構造変化ケースに `applyRadialLayout` 注入、新アクション 3 種追加、`MOVE_NODE` / `TOGGLE_PHYSICS` 削除 |
| 変更 | `src/hooks/use-drag-node.ts` | REPARENT/SNAP_BACK ディスパッチ化 |
| 変更 | `src/components/Canvas.tsx` | `usePhysics` → `useTween` |
| 変更 | `src/components/ConnectionLines.tsx` | ベジェ → 直線 |
| 変更 | `src/components/Toolbar.tsx` | 「自動配置」トグル削除 |
| 変更 | `src/storage.ts` | `vx, vy, physicsEnabled` 関連削除 |
| 変更 | `src/dsl.ts` | `vx, vy` シリアライズ削除 |
| 変更 | `src/store.test.ts` | 期待値更新、新ケース追加 |
| 変更 | `src/dsl.test.ts` | 期待値更新 |
| 削除 | `src/hooks/use-physics.ts` | 物理シュミ全体 |
| 無改変 | `src/components/NodeCard.tsx` | (位置は reducer + DOM 経由で決まる) |
| 無改変 | `src/components/EditModal.tsx` | |
| 無改変 | `src/hooks/use-pan-zoom.ts` | |
| 無改変 | `src/hooks/use-keyboard.ts` | |
| 無改変 | `src/hooks/use-board-actions.ts` | |
| 無改変 | `src/hooks/use-storage-sync.ts` | |
| 無改変 | `src/view.ts` | |
| 無改変 | `src/db.ts` | |
| 無改変 | `src/components/ZoomControls.tsx` | |
| 無改変 | `src/components/StatsPanel.tsx` | |
| 無改変 | `src/components/HelpModal.tsx` | |
