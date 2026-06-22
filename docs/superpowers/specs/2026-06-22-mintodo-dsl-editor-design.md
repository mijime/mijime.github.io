# mintodo DSL インラインエディタ デザイン

日付: 2026-06-22
パッケージ: `packages/mintodo`
関連: `docs/superpowers/specs/2026-06-21-mintodo-dsl-io-design.md` (既存の DSL I/O 機能)

## 目的

`Toolbar` の DSL Export / DSL Import / JSON Export / JSON Import ボタン 4 つを廃止し、代わりに **DSL インラインエディタモーダル** を開くボタン 1 つに置き換える。

ユーザはモーダル内のテキストエリアで現在のボードを DSL として直接閲覧・編集し、SAVE ボタンで適用する。これにより、ファイルダウンロード/アップロードの往復やクリップボードへのコピペを意識せず、テキストを 1 箇所で編集してマインドマップに反映できる。

DSL 仕様 (`src/dsl.ts`) は **変更しない**。既存の `parseDSL` / `serializeDSL` をそのまま流用する。

## 動作概要

### UI

Toolbar に新規ボタン「DSL編集」 (lucide `FileText` アイコン) を 1 個追加。クリックでモーダルが開く。

モーダルは中央寄せのフルオーバーレイで、上下に分かれた構造:

```
┌─ DSL 編集 ───────────────────────────  [×] ┐
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 買い物リスト                         │    │
│  │   牛乳 @priority:high                │    │
│  │   パン @color:sky                   │    │
│  │     バゲット @due:2026-06-25         │    │
│  │   完了済み @done                     │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ⚠ パースエラー: ...                         │   ← エラー時のみ表示 (赤字)
│                                             │
│  Cmd/Ctrl+Enter で SAVE / Esc でキャンセル   │   ← ヒント行 (常時)
│                                             │
│                       [キャンセル]  [SAVE]  │
└─────────────────────────────────────────────┘
```

- textarea: `min-height: 320px`、`font-family: monospace`、`width: 100%`、`max-width: 720px`
- ヘッダ右上 `[×]` クリック = キャンセル扱い
- 背景クリック (`onClick` on overlay) = キャンセル扱い
- 編集中のテキストは **常に破棄** される (未保存変更の警告は出さない)

### エラー表示

- `parseDSL` が `null` を返した (パース失敗) 場合、エラー領域に `DSL の形式が不正です。インデント・属性値を確認してください。` を表示
- 現状の `parseDSL` は何行目で失敗したかを返さない (すべて `null` 返却) ため、行番号は出さず一般メッセージのみ
- エラー表示中はモーダルを閉じない、SAVE ボタンは再度押せる

### SAVE フロー

1. SAVE ボタンクリック (or Cmd/Ctrl+Enter)
2. `parseDSL(text, state.currentBoardId ?? "")` を呼ぶ
3. `null` ならエラー表示して return
4. `confirm()` で上書き確認: `DSL を適用するとボード「<currentBoardName>」のタスクがすべて置き換わり、ボード名も「<parsedBoardName>」に変更されます。続行しますか?`
5. キャンセルなら return
6. `await actions.renameBoard(state.currentBoardId, parsed.board.name)`
7. `dispatch({ type: "SET_NODES", nodes: arrayToRecord(parsed.nodes) })`
8. モーダルを閉じる (`dispatch({ modal: null, type: "OPEN_MODAL" })`)

### ボード名が空のケース

- ルート (indent 0) が空文字の DSL は `parseDSL` が `null` を返すため、自然に弾かれる
- ただし「空ボードを SAVE する」操作 (textarea を空にした → SAVE) は技術的に `parseDSL("")` が `null` を返すのでエラー表示で止まる。意図的に空にすることはできない。これは OK (ノード 0 個は安全だが、ボード自体を消したいケースは「すべてリセット」ボタンで代替可能)

## モジュール構成

### 新規ファイル

#### `src/components/DslEditorModal.tsx`

- props なし (`useMindStore` から直接 state を取る)
- 内部 state: `text: string`, `error: string | null`
- mount 時に `useEffect` で `serializeDSL(currentBoard, currentNodes)` を初期値にセット
- 既存の `EditModal` / `BoardDeleteDialog` と同じ z-50 オーバーレイパターン
- グローバル `keydown` ハンドラで:
  - `Escape` → `close()`
  - `Cmd+Enter` (mac) / `Ctrl+Enter` (他) → `onSave()`
- 背景クリック・ヘッダ右上の `×` クリック = キャンセル (= `close()`)

#### `src/components/DslEditorModal.test.tsx`

vitest + `@testing-library/react` によるコンポーネントテスト。

- 開いたとき textarea に `serializeDSL` の結果が入っている
- テキストを編集して SAVE すると `parseDSL` 経由で `SET_NODES` が dispatch される
- 不正な DSL を SAVE するとエラーが表示され、dispatch は発生しない
- ボード名変更 (rename) も dispatch されている
- Esc でモーダルが閉じる
- Cmd/Ctrl+Enter で SAVE が走る
- 背景クリックでモーダルが閉じる (state 変更なし)
- ボードが空 (`state.nodes = {}`) でもエラーなく開ける

### 変更ファイル

#### `src/types.ts`

`Modal` union に追加:

```ts
| { kind: "dsl-editor" }
```

#### `src/components/Toolbar.tsx`

- 削除するボタン 4 つ: JSON Export / JSON Import / DSL Export / DSL Import
- 削除するハンドラ: `onExport`, `onImportClick`, `onExportDsl`, `onImportDslClick`, `onFile`, `onDslFile`
- 削除する ref: `fileRef`, `dslFileRef`
- 削除する hidden input 2 つ
- 削除する import: `Download`, `FileUp`, `Upload` (lucide)、`useRef` (react)、`downloadJson`, `downloadText`, `parseImportedJson` (storage)、`parseDSL`, `serializeDSL` (dsl)、`MindNode` 型
- 維持する import: `FileText` (lucide) — 旧 DSL Export から新「DSL編集」ボタンに使い回す
- 追加するボタン: `<button title="DSL編集" onClick={() => dispatch({ modal: { kind: "dsl-editor" }, type: "OPEN_MODAL" })}><FileText size={16} /></button>`

#### `src/App.tsx`

`Shell` 内に `<DslEditorModal />` を追加 (`<EditModal />` の隣など)。

```tsx
<DslEditorModal />
```

#### `src/storage.ts`

`downloadJson`, `downloadText`, `parseImportedJson` を削除 (他で使われていないか確認の上で削除)。`downloadJson`/`downloadText` は export 系でのみ使用されていたため削除可。`parseImportedJson` も JSON インポートでのみ使用。

#### 削除ファイル

- なし (`parseDSL` / `serializeDSL` はモーダルから使うので残す)

## 受け入れ条件

- `pnpm test` が全件通る
- `pnpm run check` がエラーなしで通る
- Toolbar に「DSL編集」ボタン 1 個だけが残る (JSON / DSL 旧 4 ボタンは消えている)
- 「DSL編集」クリックでモーダルが開き、現在の DSL が textarea に入っている
- テキストを編集 → SAVE で confirm 後、ノードが置き換わりボード名も変わる
- 不正な DSL で SAVE を押すと、エラーメッセージが表示されマインドマップは変わらない
- Esc / 背景クリック / × / キャンセル でモーダルが閉じる (未保存変更は破棄)
- Cmd/Ctrl+Enter で SAVE される
- 既存の他の機能 (ボード作成・削除、EditModal、HelpModal、物理シミュレーション、IndexedDB 永続化) が壊れていない

## スコープ外 (YAGNI)

- 双方向リアルタイム同期 (textarea とキャンバスが live link する) — 単方向 apply のみ
- DSL ⇄ JSON 切替タブ
- クリップボードコピー / ファイルダウンロード
- 未知属性の保持 (現状の DSL 仕様で破棄される動作を維持)
- パース失敗時の行番号表示 (parser を強化しない)

## 影響範囲

| 種別 | ファイル | 影響 |
|---|---|---|
| 新規 | `src/components/DslEditorModal.tsx` | モーダル UI |
| 新規 | `src/components/DslEditorModal.test.tsx` | 単体テスト |
| 変更 | `src/types.ts` | `Modal` union に `dsl-editor` 追加 |
| 変更 | `src/components/Toolbar.tsx` | 4 ボタン削除、1 ボタン追加、ハンドラ整理 |
| 変更 | `src/App.tsx` | 新モーダルをマウント |
| 変更 | `src/storage.ts` | `downloadJson` / `downloadText` / `parseImportedJson` 削除 |
| 無改変 | `src/dsl.ts` | 既存 API をそのまま流用 |
| 無改変 | `src/store.ts` | 既存 Action (`SET_NODES` / `RENAME_BOARD`) を流用 |
| 無改変 | `src/hooks/use-board-actions.ts` | 既存 `renameBoard` を流用 |
| 無改変 | `src/db.ts` | DB スキーマ変更なし |
| 削除 | (Toolbar.tsx 内) | 旧 4 ボタン / 旧ハンドラ / 旧 hidden input / 旧 import |
