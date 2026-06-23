# mintodo インライン編集 & DSL インライン入力 デザイン

日付: 2026-06-22
パッケージ: `packages/mintodo`
関連:
- `docs/superpowers/specs/2026-06-21-mintodo-dsl-io-design.md` (DSL 文法)
- `docs/superpowers/specs/2026-06-22-mintodo-dsl-editor-design.md` (ボード全体 DSL モーダル)

## 目的

ノード操作の UX を以下の通り改善する。

1. **クリックで選択** — ノード本体クリックで `SELECT` を発行。既存の `.node-selected` スタイルがハイライト表示
2. **ダブルクリックで編集** — ノードを直接インライン編集する UI を開く。モーダル遷移を挟まず、その場で編集・保存
3. **属性編集の折りたたみ** — インライン編集 UI の属性セクション (色 / 優先度 / 期限) はデフォルト畳まれ、属性編集バーをクリックで展開
4. **空初期値** — 新規子ノードの `text` は `""` で生成 (現状の `"新規タスク"` を廃止)
5. **DSL インライン入力** — インライン編集のテキスト欄に `買い物 @priority:high @done` のように DSL トークンを書ける。保存時に `parseDSL` と同じ規則でパースし、属性に反映

## 動作概要

### ノードライフサイクル (編集)

```
read state ─click→ selected
selected   ─dblclick→ editing
editing    ─Enter / Save ボタン / 外部クリック (canvas や他ノード) → SAVE_INLINE_EDIT (UPDATE_NODE) → read state
editing    ─Esc / Cancel ボタン → CANCEL_INLINE_EDIT → read state
editing    ─Save で text 空 & DSL トークン無し → DELETE_NODE してから CLOSE_INLINE_EDIT → read state
editing    ─Cancel で「作成直後のノード」だった場合 → CANCEL_INLINE_EDIT 内で DELETE_NODE 処理 → read state
```

「作成直後」は `state.pendingCreationNodeId` で識別。`ADD_CHILD` 時にセットされ、最初の `SAVE_INLINE_EDIT` または `CANCEL_INLINE_EDIT` でクリアされる。`CLOSE_INLINE_EDIT` 単独では「編集を閉じるだけでノードはそのまま残す」ケースに使う (例: 他経路で編集を終わらせた場合)。

### インライン編集 UI

ダブルクリックしたノードの位置に `NodeInlineEditor` を重ねて描画する。ノード本体 (カード) は編集モード中、非表示にする (`NodeCard` の通常 render を編集時に置き換える)。

```
┌─────────────────────────────────────────────┐
│ 買い物 @priority:high @done                 │  ← textarea (autofocus, autosize)
│                                             │
│  ▾ 属性 (3)                                  │  ← 折りたたみ (デフォルト畳)
│  ┌─────────────────────────────────────┐    │
│  │ 色   ◯slate ◯sky ◯emerald ◯rose    │    │  ← 展開時
│  │ 優先度 [低] [中] [高]               │    │
│  │ 期限 [2026-06-25]                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│   [キャンセル]    [保存]                     │
└─────────────────────────────────────────────┘
```

- textarea: ノードのテキスト幅に合わせて `min-width: 240px`, `max-width: 480px`, 自動で行数拡張
- ヘッダ下に属性バー。トグルボタン `▾ 属性 (N)` を押すと展開
- 展開中のみ 3 セクション (色 / 優先度 / 期限) を表示
- `N` は現在 `parseDSL`-equivalent で解釈できる属性数 (DSL 入力からの自動検出 + 手動設定の OR)。初期は 0
- ボタン: `キャンセル` / `保存`。`保存` 押下時にバリデーション

### DSL インライン入力

textarea に `買い物 @priority:high @done` のように書くと:
- 保存時にパース
- ノードの `text` から `@` トークンを除外した `買い物` のみが永続化される
- 抽出された属性 (`priority: high`, `completed: true`) がノード属性に反映
- ノード表示は `買い物` のみ (トークン非表示)

**DSL の優先順位**: textarea 内の `@` トークンが **single source of truth**。属性バーは DSL と同期した「プレビュー兼手動上書き」UI として振る舞う。

- textarea に `@priority:high` と書くと → 属性バーの優先度セクションが「高」になる (DSL が bar を上書き)
- 属性バーで「中」をクリックすると → バーは「中」になる (bar が DSL を一時上書き)。ただし textarea を再編集すると DSL が再パースされ、bar は DSL の値に戻る
- 保存時: 現在の bar 値 (DSL か手動かに関係なく、bar が今表示している値) を採用
- つまり「bar に今表示されている値が保存される」。DSL は bar を駆動するルール

例:
- textarea: `買い物 @priority:high` + 優先度バーで「中」選択 (←bar クリックで上書き) → 保存結果は `priority: 中` (bar の現在の値)
- textarea: `買い物` + 優先度バーで「高」選択 → 保存結果は `priority: high`
- textarea: `買い物 @priority:high` (bar 未操作) → 保存結果は `priority: high`

不正トークン (`@priority:urgent`) は無視し、テキストとしても残す (`買い物 @priority:urgent` のまま保存される)。これは `parseDSL` と同じ寛容さ。

### ノード新規作成の挙動

- プラスボタン / `Tab` / `Enter` で `ADD_CHILD` → 直後にインライン編集開始 (モーダル `EditModal` は開かない)
- 作成直後のノード `text: ""`、`categoryColor: parent.categoryColor` (継承)、その他デフォルト
- reducer 内で `editingNodeId = newId` と `pendingCreationNodeId = newId` を同時セット
- ユーザーはインライン編集でテキスト (と任意の DSL) を入力
- 空保存 (text なし & DSL トークンなし) で **自動削除** される
- Cancel / Esc すると `pendingCreationNodeId === editingNodeId` のため、新規作成も **取り消されてノードが削除** される
- 外部クリック (canvas / 他ノード) で確定保存される。`pendingCreationNodeId` はクリアされる。新規ノードで空のまま確定保存 → 削除 (同上)

### クリック / ダブルクリック / ドラッグの競合

既存の `NodeCard` は HTML5 ネイティブドラッグ (`draggable={true}`) を持つ。ネイティブドラッグは **一定距離の移動** を伴わないと発火しないため、純粋な click / dblclick とは競合しない。

- **click** (移動なし): `dispatch({ type: "SELECT", id })` を発行
- **dblclick** (移動なし): `dispatch({ type: "OPEN_INLINE_EDIT", nodeId })` を発行
- **mousedown + 移動**: HTML5 ドラッグが発火。SELECT は click 側で dispatch されるためドラッグ中は抑止されない (ドラッグ完了後に click が fire しないのが通常の挙動)
- **編集モード中**: `draggable={false}` にしてドラッグを抑止。内部ボタンの `e.stopPropagation()` は据え置き

`use-keyboard.ts` のグローバルショートカット (`Tab` / `Enter` / `E` / 矢印) は **インライン編集中は無効化**。`state.editingNodeId` を参照してガードする。

## データモデル拡張

### State 追加

`src/store.ts` の `State` に以下を追加:

```ts
editingNodeId: string | null;        // インライン編集中のノード id
pendingCreationNodeId: string | null; // ADD_CHILD 直後でまだ保存もキャンセルもされていない新規ノード id
```

### Action 追加

| Action | 効果 |
|---|---|
| `OPEN_INLINE_EDIT` | `editingNodeId = action.nodeId`、`selectedNodeId` も同時セット |
| `CLOSE_INLINE_EDIT` | `editingNodeId = null`、`pendingCreationNodeId = null`。(削除判定は `CANCEL_INLINE_EDIT` 側で行う) |
| `CANCEL_INLINE_EDIT` | `CLOSE_INLINE_EDIT` と同じ状態リセット + `pendingCreationNodeId === editingNodeId` ならその新規ノードを削除 (DELETE_NODE と同等の reducer 処理) |
| `SAVE_INLINE_EDIT` | payload を `UPDATE_NODE` で適用し、両 state を null にする。**削除判定は component 側で行う** (空 + トークン無しなら component が直接 `DELETE_NODE` を dispatch してから `CLOSE_INLINE_EDIT` を dispatch) |

`SAVE_INLINE_EDIT` の payload:

```ts
{ type: "SAVE_INLINE_EDIT"; patch: { text: string; priority: Priority; categoryColor: CategoryColor; dueDate: string; completed: boolean } }
```

payload は `NodeInlineEditor` 側で DSL パース + 属性バー値マージ済みの完全な `MindNode` パッチ。reducer は機械的に `UPDATE_NODE` を適用するだけ。

### 既存 Action 変更

- `ADD_CHILD` (`store.ts:171-196`): `text: "新規タスク"` → `text: ""`
- `RESET` (root 初期化): 変更なし (`board?.name ?? "メインプロジェクト"` のまま)。root は空文字を許可しない (ボード名が必要)

### 新規 DSL ヘルパー

`src/dsl.ts` に追加:

```ts
export interface InlineDslResult {
  text: string;
  hasAnyAttribute: boolean;
  priority: Priority | null;      // null = 未指定 (呼び出し側の属性バー設定を維持)
  categoryColor: CategoryColor | null;
  dueDate: string | null;
  completed: boolean | null;      // null = 未指定
}

export function parseInlineDSL(text: string): InlineDslResult
```

- 既存 `parseDSL` の属性抽出ロジックを薄く再利用
- 1 行専用: インデント・ルート・空文字エラーの概念なし
- 1 つのテキストを「text 部分」と「attribute トークン列」に分解
- 不正トークン (`@priority:urgent` 等): **黙って無視** してテキスト側に残す (寛容なパース)
- 空文字入力: `{ text: "", hasAnyAttribute: false, ... null }` を返す
- `hasAnyAttribute` は認識可能トークン (`@priority` / `@color` / `@due` / `@done`) のいずれかが含まれていれば true。未知トークンは含めない

## モジュール構成

### 新規ファイル

#### `src/components/NodeInlineEditor.tsx`

- props: `{ node: MindNode; onCancel: () => void; onSave: (patch: { text: string; priority: Priority; categoryColor: CategoryColor; dueDate: string; completed: boolean }) => void; onDelete: () => void }`
- 内部 state:
  - `text: string` — textarea の値 (初期値は `node.text` だが @ トークン除去はしない; 生で保持)
  - `expanded: boolean` — 属性バー展開フラグ (デフォルト `false`)
  - `color: CategoryColor`, `priority: Priority`, `dueDate: string` — 属性バーの値 (DSL 再パース時に DSL 値で上書きされる)
  - `barTouched: boolean` — ユーザが属性バーをクリックしたら true。true の間、textarea 再編集でも bar は DSL 値でリセットされない
- レイアウト:
  - textarea (最上段、`autoFocus`)
  - 折りたたみトグル行 (`▸ 属性` / `▾ 属性 (N)`)
  - 展開時: 色 swatches (4) / 優先度 buttons (3) / 期限 input
  - フッタ: `キャンセル` / `保存` ボタン
- キーボード:
  - textarea 内 `Enter` (Shift なし) → 保存
  - textarea 内 `Shift+Enter` → 改行
  - `Escape` → キャンセル
- textarea 変更ハンドラ:
  1. `setText(value)`
  2. `parseInlineDSL(value)` で `dsl` を取得
  3. `!barTouched` の場合のみ `setColor(dsl.categoryColor ?? node.categoryColor)` 等で属性バーを DSL 値で更新
- 属性バークリックハンドラ:
  1. 該当 state を更新
  2. `setBarTouched(true)`
- 保存ロジック (`onSave` 呼び出し前):
  1. `parseInlineDSL(text)` で `dsl` を取得
  2. `dsl.text === "" && !dsl.hasAnyAttribute` → `onDelete()` を呼んで終了
  3. それ以外 → `onSave({ text: dsl.text, priority, categoryColor: color, dueDate, completed })` (属性バーの現在の値がそのまま保存される)

#### `src/components/NodeInlineEditor.test.tsx`

vitest + `@testing-library/react`:
- 開いたとき textarea に `node.text` が入っている
- `@priority:high` を入力すると属性バーの優先度セクションが「高」を active 表示
- 属性バー「中」をクリック後、textarea を編集すると `barTouched` の挙動次第で bar は「中」のまま (再パースで上書きされない)
- 属性バー「高」をクリック、テキストに何も書かず保存 → `priority: high` で `onSave` される
- 空テキスト + トークン無し → `onDelete` が呼ばれる
- テキスト + トークン無し + 属性バー設定のみ → 通常の `onSave` が呼ばれる
- キャンセル時 → `onSave` も `onDelete` も呼ばれない
- Enter で保存、Shift+Enter で改行 (保存されない)、Esc でキャンセル

### 変更ファイル

#### `src/types.ts`

`State` は `store.ts` で定義されているため型はそっち。`types.ts` 自体への変更は不要 (新エンティティは追加しない)。

#### `src/store.ts`

- `State` に `editingNodeId: string | null` と `pendingCreationNodeId: string | null` を追加
- `Action` に `OPEN_INLINE_EDIT` / `CLOSE_INLINE_EDIT` / `CANCEL_INLINE_EDIT` / `SAVE_INLINE_EDIT` を追加
- 各 case を reducer に追加
- `createInitialState` の両 state を `null` に
- `ADD_CHILD`: `text: "新規タスク"` → `text: ""`、かつ `editingNodeId: newId` / `pendingCreationNodeId: newId` を同時セット
- `CANCEL_INLINE_EDIT`: `pendingCreationNodeId === editingNodeId` ならそのノードを削除 (children 含む) してから両 state を null にする
- `SAVE_INLINE_EDIT`: payload を読んで `UPDATE_NODE` 相当の処理。空 + トークン無しの削除判定は component 側で先に `DELETE_NODE` を dispatch する

#### `src/dsl.ts`

`parseInlineDSL` 関数を追加。既存 `parseDSL` と同じ属性認識規則を使うが、行構造チェック (indent / root / 空文字エラー) は行わない。

#### `src/components/NodeCard.tsx`

- props で `onRequestEdit: (id: string) => void` を受け取る (App レベルから dispatch を隠蔽するため)
- カード本体 div に `onClick`, `onDoubleClick` を追加。`e.stopPropagation()` を内部ボタンはそのまま
- `state.editingNodeId === node.id` のとき、read 表示の代わりに `<NodeInlineEditor />` を描画 (App 側で `editingNodeId` を解決して該当ノードだけ編集モード)
- 編集モード中は `draggable={false}`
- 編集モード中は折り畳みボタン・追加ボタン・「…」を非表示
- 既存の `dispatch({ modal: { kind: "edit", nodeId }, type: "OPEN_MODAL" })` の ellipsis ハンドラは残す (EditModal への直接アクセスは温存)

#### `src/components/Canvas.tsx`

`NodeCard` に `onRequestEdit={(id) => dispatch({ type: "OPEN_INLINE_EDIT", nodeId: id })}` を渡す。

#### `src/components/App.tsx` (Shell)

新規 `+` ボタン・`Tab`・`Enter` 経由の新規ノード作成直後、自動でインライン編集を開始する dispatch を発行する。`ADD_CHILD` の reducer 内で `editingNodeId: newId` と `pendingCreationNodeId: newId` を同時セットする。

これにより、シェルからの dispatch は従来通り `{ type: "ADD_CHILD", newId, parentId }` だけで OK。インライン編集が自動で開く。

#### `src/hooks/use-keyboard.ts`

`state.editingNodeId !== null` の間は全ショートカットを early return する。

#### `src/components/EditModal.tsx`

- 変更 **しない**。`@` トークン入力はそのまま text として保存される (現状挙動)
- 「…」ボタンからの導線は維持。インライン編集と二系統残る (これは意図的 — アクセシビリティ・既存ユーザの習熟)

#### `src/components/NodeCard.test.tsx`

- click で `SELECT` が dispatch される
- dblclick で `OPEN_INLINE_EDIT` が dispatch される
- 編集モード中のカードでは dblclick / click が再発火しない (編集UI内クリックで外側 click が起きないこと)

### 削除

なし。`EditModal` は「…」から引き続き利用可能。

## 受け入れ条件

- `pnpm test` 全件 pass
- `pnpm run check` エラーなし
- ノードをクリックすると選択ハイライト (`.node-selected`) が付く
- 同じノードをダブルクリックすると、その場でインライン編集 UI に切り替わる
- インライン編集 UI には:
  - テキスト入力欄 (textarea, autofocus)
  - デフォルト畳まれた「属性」セクション
  - 展開で色 / 優先度 / 期限の 3 セクション
  - キャンセル / 保存ボタン
- textarea に `タスク @priority:high @done` と入力して保存すると、ノードは `テキスト=タスク, priority=high, completed=true` になる
- ノード表示には `タスク` のみが出る (DSL トークンは消える)
- 属性バーで「高」を選び、テキストに何も書かず保存すると `priority: high` で保存される
- テキストを空のまま保存すると、そのノードは削除される
- テキストに `@priority:urgent` のような不正値を書くと、そのトークンは無視されてテキストとして残る
- 新規子ノード作成 (`Tab` / `Enter` / `+`) 直後にインライン編集が自動で開き、テキストは空
- 編集モード中は `Tab` / `Enter` / 矢印 / `E` のグローバルショートカットが無効
- ドラッグ (mousedown + 移動) と クリック / ダブルクリックが干渉しない
- 既存の「…」ボタン → `EditModal` の経路は維持される
- 既存の折り畳み・子追加・DnD リペアレント・DSL ボードエディタ・IndexedDB 永続化が壊れていない

## スコープ外 (YAGNI)

- textarea の自動補完 / 入力候補
- ノード表示での属性バッジ表示 (色は左 border で既に出ている。優先度/期限の visual badge は追加しない)
- インライン編集の undo / redo
- 複数ノード同時編集
- インライン編集から直接の子追加
- EditModal への DSL 入力反映 (要望があれば別途)
- 属性バーで設定した値の即時ノード反映 (保存時のみ反映)

## 影響範囲

| 種別 | ファイル | 影響 |
|---|---|---|
| 新規 | `src/components/NodeInlineEditor.tsx` | インライン編集 UI |
| 新規 | `src/components/NodeInlineEditor.test.tsx` | 単体テスト |
| 変更 | `src/store.ts` | `editingNodeId` + `pendingCreationNodeId` state + 4 action (OPEN / CLOSE / CANCEL / SAVE) + `ADD_CHILD` の text="" + reducer で自動 inline edit 開始 |
| 変更 | `src/dsl.ts` | `parseInlineDSL` 追加 |
| 変更 | `src/components/NodeCard.tsx` | click/dblclick + 編集モード時の render 切替 + draggable 抑止 |
| 変更 | `src/components/Canvas.tsx` | `onRequestEdit` 受け渡し |
| 変更 | `src/hooks/use-keyboard.ts` | 編集中ショートカット無効化 |
| 変更 | `src/components/NodeCard.test.tsx` | click / dblclick テスト追加 |
| 無改変 | `src/components/EditModal.tsx` | 据え置き |
| 無改変 | `src/components/Toolbar.tsx` | 据え置き |
| 無改変 | `src/components/DslEditorModal.tsx` | 据え置き |
| 無改変 | `src/storage.ts` | 据え置き |
| 無改変 | `src/db.ts` | スキーマ変更なし |
| 無改変 | `src/types.ts` | 新エンティティなし |
