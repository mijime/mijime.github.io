# mintodo kanban view

日付: 2026-06-23
パッケージ: `packages/mintodo`

## 背景

現行の mintodo は mindmap (radial) ビューのみで、ワークフローの前進 (inbox → wip → review → done) を扱う仕組みがない。`MindNode.completed` は boolean のため中間状態が表現できない。

複数ボードを持つユーザーが増えており、ボードごとに「構造の整理 (mindmap)」と「作業の前進 (kanban)」を切り替えたいケースが出てきた。

## ゴール

- `MindNode` に `status: "inbox" | "wip" | "review" | "done"` を追加
- toolbar に mindmap / kanban の view 切替タブを追加
- kanban ビューを追加 (4 カラム固定)
- status 変更は drag&drop、EditModal ピッカー、DSL の 3 系統で揃える
- 既存ノードに `status` が無いものは `completed ? "done" : "inbox"` で補完 (migration)
- view 切替はボードごとに記憶

## データモデル

### types.ts

```ts
export type TaskStatus = "inbox" | "wip" | "review" | "done";
export const TASK_STATUSES: readonly TaskStatus[] = ["inbox", "wip", "review", "done"] as const;

export interface MindNode {
  // ... 既存フィールド
  status: TaskStatus;   // NEW: required
  completed: boolean;   // 既存: status === "done" と必ず同期
}
```

### status と completed の同期ルール (reducer で強制)

- 任意の status 変更時:
  - `status === "done"` → `completed = true`、子孫へも `status="done"` + `completed=true` をカスケード (既存の `TOGGLE_COMPLETE` と同じ伝播)
  - `status !== "done"` → `completed = false`、子孫には伝播しない (各ノード独立)
- 既存の `TOGGLE_COMPLETE` action は `SET_STATUS` に delegate する形に書き換え:
  - `target.completed === true` なら `SET_STATUS(id, "review")` (= 「完了取り消し」は review に戻す)
  - それ以外は `SET_STATUS(id, "done")`

## State と Action

### store.ts

```ts
export type ViewMode = "mindmap" | "kanban";

export interface State {
  // ... 既存
  viewMode: ViewMode;   // NEW
}

export type Action =
  | /* 既存 */
  | { type: "SET_VIEW_MODE"; viewMode: ViewMode }
  | { type: "SET_STATUS"; id: string; status: TaskStatus };
```

- `SET_VIEW_MODE`: 現在の `viewMode` を切り替え。`SET_CURRENT_BOARD` の前に呼ばれた場合は無視 (currentBoardId が null なら何もしない)
- `SET_STATUS`: `id` の status を変更。`status === "done"` なら子孫へカスケード
- `ADD_CHILD` / `CREATE_CHILD` / `RESET` で作成される root・子ノードの初期 `status` は `"inbox"` (root は子孫がいると完了扱いしないため、root の status は view 上意味を持たないが初期値 `"inbox"` で固定)

## 永続化と migration

### db.ts

Dexie スキーマ変更なし (既存の `nodes` テーブルに `status` フィールドが書かれるだけ)。

### storage.ts

- `loadNodesForBoard`: 取得後 `status === undefined` のノードを `completed ? "done" : "inbox"` で補完
- 新規: `getViewMode(boardId)`, `setViewMode(boardId, viewMode)`
  - meta key: `viewMode:{boardId}`、値は `"mindmap" | "kanban"`
- 新規ボード作成時: `viewMode` デフォルト `"mindmap"`、meta は未設定 (= デフォルト値を使用)
- `loadBoards` 経路のメタ取得: `useStorageSync` で全ボードの `viewMode` を解決する必要なし。現在ボードのみ解決すればよい

### useStorageSync.ts

- ボード切替時に当該 board の `viewMode` を meta から読み込み `SET_VIEW_MODE` を dispatch
- `SET_VIEW_MODE` 発火時に meta へ `setViewMode(boardId, viewMode)` を debounce で書き込む (300ms、nodes 保存と同じパターン)

## UI 構造

### Toolbar

- 既存ヘッダー中央付近 (検索ボックスの左隣) に `<ViewModeToggle />` を追加
- 視覚: 2 つのトグルボタン (mindmap / kanban)。選択中を `--terra` 背景で強調
- icon: `Network` (mindmap) / `LayoutGrid` (kanban) (lucide-react)

### App.tsx

- `state.viewMode === "mindmap"` → `<Canvas />` を描画 (既存)
- それ以外 → `<KanbanBoard />` を描画

### 新規コンポーネント

#### components/KanbanBoard.tsx

- 4 カラムを `flex flex-row gap-4 overflow-x-auto` で横並びに配置
- `padding: 80px 16px 16px` (toolbar の高さぶん上パディング)
- 各カラムは `<KanbanColumn status={status} />`
- ボード未選択 / ノード空 の場合は空状態

#### components/KanbanColumn.tsx

- Props: `status: TaskStatus`
- ヘッダ部: ステータス名 (inbox / wip / review / done) + 該当ノード数
- カードリスト: 当該 status のノードを `<KanbanCard node={n} />` で描画
- 末尾に `<button>+ Add task</button>` ボタン (押下で `OPEN_MODAL { kind: "edit-new", parentId: "root" }` + `parentStatusSeed: status` を modal 経由で EditModal へ伝達)
  - 実装方法: `Modal` 型に `parentStatusSeed?: TaskStatus` を追加 (edit-new 時のみ)
- カラム幅: 固定 `w-72 shrink-0`
- スクロール: カラム内 `overflow-y-auto`

#### components/KanbanCard.tsx

- Props: `node: MindNode`
- 表示:
  - パンくずパス: ルートから自身までの祖先 `text` を ` / ` 区切りで小さく表示 (祖先が居れば先頭に `…` を付けて祖先 2 段 + 自身の `text` を表示)
  - タスク本文 (`node.text`)
  - 優先度 / 期限 / カテゴリのバッジ (既存 NodeCard のロジックを関数化、`formatBadges(node)` を共有 util として export)
  - 完了チェック: `status === "done"` なら checked・取り消し線
  - カード右下 `+` ボタン: 押下で `OPEN_MODAL { kind: "edit-new", parentId: node.id }` (新規子の status は `"inbox"` で固定)
- drag&drop: `KanbanColumn` 側の drop 領域と組み合わせる
  - `draggable` にして `onDragStart` で `dataTransfer.setData("application/x-mindnode-id", node.id)` + `SET_DRAGGING`
  - `onDragEnd` で `SET_DRAGGING(null)`

#### 既存 NodeCard の変更

- 子を持つカードの `+` ボタンは Kanban と同等 (`parentId=node.id, status="inbox"`) のまま維持
- バッジ描画ロジックを `lib/badges.ts` (新規) に切り出し、NodeCard と KanbanCard で共有

## ステータス変更 UX

### 1. drag&drop

- `KanbanColumn` 側: `onDragOver` で `e.preventDefault()`、`onDrop` で `dataTransfer.getData("application/x-mindnode-id")` を取得し `SET_STATUS` を dispatch
- `KanbanCard` 側: `draggable`, `onDragStart` で ID を dataTransfer へ、`onDragEnd` で `SET_DRAGGING(null)`
- カーソル: drag 中のカラムは `ring-2 ring-sky-400` でハイライト

### 2. EditModal 内の status ピッカー

- 「属性」セクションに 4 ボタンの status ピッカーを追加 (priority ピッカーと同様の `grid grid-cols-4 gap-2`)
- ラベル: `受信箱 / 作業中 / レビュー / 完了`
- 既存ロジックへの統合:
  - `parseInlineDSL` が `@status:xxx` を返した場合、ローカル `status` state を上書き
  - `commit` 時に `patch.status` を含めて dispatch
- `edit-new` 時: `modal.parentStatusSeed` があればそれで初期化、なければ `"inbox"`

### 3. DSL

#### parseDSL / parseInlineDSL (src/dsl.ts)

- `@status:inbox` / `@status:wip` / `@status:review` / `@status:done` を認識
- 未知値 → reject (parseDSL) / text 扱い (parseInlineDSL)
- `InlineDslResult` に `status: TaskStatus | null` を追加
- 既存 `@done` は後方互換として維持 (= `status: "done"` と同義)
- 新規ノードの DSL 入力で `@done` を使った場合は `completed: true` に加え `status: "done"` もセット

#### serializeDSL

- `status !== "inbox"` のノードは `@status:xxx` を出力
- `status === "inbox"` のノードは出力しない (デフォルトのため)
- `@done` は出力しない (`@status:done` で表現する)

## テスト変更

### store.test.ts (追加)

- `SET_STATUS`:
  - inbox → wip で `completed` が `false` のまま、子孫に伝播しない
  - wip → done で `completed` が `true`、子孫も done+completed になる
  - done → wip で `completed` が `false`、子孫はそのまま
  - 存在しない `id` で state 変化なし
- `TOGGLE_COMPLETE`:
  - 既存挙動 (完了マーク → 自身と子孫を完了) を維持
  - 内部実装が `SET_STATUS` 経由になっても観察される挙動は同一
- `SET_VIEW_MODE`:
  - 単純な切り替え
  - `currentBoardId === null` のとき無視 (state 不変)
- `ADD_CHILD` / `CREATE_CHILD`:
  - 新規ノードの `status === "inbox"`

### storage.test.ts (追加)

- `getViewMode` / `setViewMode`: round-trip、未設定時 `undefined`
- `loadNodesForBoard`: status 欠損ノードが `inbox` / `done` 補完される

### dsl.test.ts (追加)

- `@status:wip` パース・シリアライズ round-trip
- 未知値 reject (parseDSL) / text 扱い (parseInlineDSL)
- `@done` が後方互換で `status: "done"` に翻訳されること

### components/EditModal.test.tsx (追加)

- status ピッカー操作で status が変わること
- `@status:review` を inline DSL で入力するとピッカーが review になること
- `parentStatusSeed` (edit-new 経由) で初期 status がセットされること

### components/KanbanBoard.test.tsx / KanbanCard.test.tsx (新規)

- 4 カラムが描画され、各ノードが正しいカラムに表示
- カードを別カラムに drop すると status が変わる
- done への drop で子孫も done になる
- カードの `+` で `edit-new` modal が開く (parentId=card.id)
- カラム末尾の `+` で `edit-new` modal が開く (parentId=root, parentStatusSeed=column.status)
- カードにパンくずパスが表示される (深い階層)

### integration.test.tsx (追加)

- ボード作成 → toolbar 切替 → kanban 表示 → drop → DSL 経由編集 → 状態保存
- view mode がボードごとに記憶される (board A: kanban, board B: mindmap に切替後リロードで維持)

## モジュール変更まとめ

### 変更

- `src/types.ts`: `TaskStatus` 型、`TASK_STATUSES`、`Modal.parentStatusSeed?`、`MindNode.status` 追加
- `src/store.ts`: `ViewMode` 型、`State.viewMode`、`SET_VIEW_MODE` / `SET_STATUS` action、reducer case、`TOGGLE_COMPLETE` の `SET_STATUS` 経由書き換え、新規ノード初期 status
- `src/dsl.ts`: `parseDSL` / `parseInlineDSL` / `serializeDSL` の status 対応
- `src/storage.ts`: `getViewMode` / `setViewMode`、`loadNodesForBoard` の status 補完
- `src/hooks/use-storage-sync.ts`: viewMode 読み込みと debounce 保存
- `src/App.tsx`: `viewMode` による Canvas / KanbanBoard 切替
- `src/components/Toolbar.tsx`: `<ViewModeToggle />` 追加
- `src/components/EditModal.tsx`: status ピッカー、`parentStatusSeed` 対応、commit 時の status 反映
- `src/components/NodeCard.tsx`: バッジ描画を `lib/badges.ts` へ切り出し
- `src/lib/badges.ts` (新規): `formatBadges(node: MindNode): string` などの共有描画関数
- 関連テストすべて

### 新規

- `src/components/KanbanBoard.tsx`
- `src/components/KanbanColumn.tsx`
- `src/components/KanbanCard.tsx`
- `src/components/ViewModeToggle.tsx` (toolbar パーツ)
- `src/lib/badges.ts`
- 上記各テスト

### 無改変

- `src/db.ts` (Dexie スキーマ変更なし)
- `src/components/ConnectionLines.tsx`
- `src/components/BoardSidebar.tsx` および関連ダイアログ
- `src/hooks/use-pan-zoom.ts` / `use-tween.ts` (mindmap のみ)
- `src/layout/radial.ts`

## 受け入れ条件

- `pnpm test` 全件 pass (新規・既存)
- `pnpm run check` エラーなし
- 4 カラム (inbox / wip / review / done) が横並びで描画される
- カードを drag&drop でカラム間移動できる。done への drop で子孫も done になる
- EditModal の status ピッカーで status を変更できる
- DSL `@status:wip` 等で status を変更できる
- view mode 切替がボードごとに永続化される (リロード後も維持)
- 既存ノード (status 欠損) は `completed` に応じて inbox/done に補完される
- 既存テスト (status / view mode に直接関係しないもの) は無改変で通る

## スコープ外 (YAGNI)

- カラム幅のカスタマイズ
- WIP limit (WIP カラムに N 件以上入れたら警告)
- カラムの順序変更 / 非表示
- フィルタ (担当者ラベル等)
- swimlane
- カード内サブタスク折りたたみ
- ボード横断の kanban (複数ボードのタスクを 1 つの kanban に集約)
- status 履歴 (いつ status が変わったかのログ)
- status 自動遷移 (ルールエンジン)
- 完了時刻 (doneAt タイムスタンプ)
