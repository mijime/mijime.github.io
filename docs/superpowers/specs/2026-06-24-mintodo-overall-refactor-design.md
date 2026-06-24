# mintodo 全体改修 デザイン

日付: 2026-06-24
パッケージ: `packages/mintodo`

## 目的

mintodo の UI / DSL を以下の方針で改修する:

1. mindmap モードと KANBAN モードのカード操作を揃える
2. ステータス・編集 UX・スクロール挙動を改善する
3. DSL エディタをモーダルではなく view mode の 3 つ目として切り出す
4. DSL テキストを Mermaid `mindmap` 構文に統一する
5. 不要になった `ShortcutHint` オーバーレイを撤去する

スコープ: 上記 5 項目。ヘッダー文言 / ダーク/ライト切替 / カード複数行 / ライト背景の 4 項目は変更なし (完了扱い)。

## 動作概要

### 1. TaskCard 共通化

`src/components/TaskCard.tsx` を新規作成し、共通 UI をまとめる。`NodeCard` と `KanbanCard` は薄いラッパになる。

#### TaskCard の責務

- 完了チェックボックス (lucide `Check` / `XCircle`)
- テキスト表示 (`whitespace-pre-wrap break-words max-w-[240px]`)
- `GitBranch` ボタン → `dispatch({ modal: { kind: "edit-new", parentId: node.id }, type: "OPEN_MODAL" })`
- status 4 色ドット (inbox=`slate` / wip=`sky` / review=`amber` / done=`emerald`)
- 期限 / 重要 badge 行 (`formatBadges` をそのまま使用)
- categoryColor ドット (既存の `categoryDotClass` をそのまま使用、status ドットと並べて badge 行末尾に配置)

#### NodeCard (ラッパ)

- 絶対配置 + 親 transform 内の `left/top`
- dnd-kit `useDraggable` + `useDroppable`、ルートはドラッグ不可
- 子ありのとき collapse / expand (`ChevronUp` / `ChevronDown`)
- ellipsis ボタン → `edit` モーダル
- ルートノードは `background: var(--terra)` の既存スタイル維持
- `isSelected` / `isMatch` / `isRingVisible` の枠線
- badge 末尾に categoryColor ドットを **追加** (status ドットとは別)

#### KanbanCard (ラッパ)

- flex 配置 (縦並び)
- 上部にパンくず (`buildBreadcrumb` の `… / X / Y` 形式)
- カード本体クリックで `edit` モーダル
  - dnd-kit の `PointerSensor` を `activationConstraint: { distance: 8 }` で立ち上げ済みなので、click と drag は `KanbanBoard` 側のロジックで判別
  - `KanbanCard` 自体に `onClick` を追加し、`e.detail === 1` (短クリック) なら `dispatch({ modal: { kind: "edit", nodeId: node.id }, type: "OPEN_MODAL" })`
- dnd-kit `useDraggable` (KABAN 列間移動用)

### 2. status 4 色ドット

新規ヘルパ `lib/badges.ts` に追加:

```ts
export function statusDotClass(status: TaskStatus): string {
  switch (status) {
    case "inbox":   return "bg-slate-400";
    case "wip":     return "bg-sky-500";
    case "review":  return "bg-amber-500";
    case "done":    return "bg-emerald-500";
  }
}
```

`TaskCard` の badge 行内、categoryColor ドットの隣に丸 8px で並べる。

### 3. KANBAN 編集 / スクロール

- 編集: `KanbanCard` の `onClick` を新規追加
- スクロール: `KanbanBoard` のルート `<div className="w-full h-full overflow-x-auto">` は維持しつつ、内側ラッパに `h-full overflow-hidden` を追加
- `KanbanColumn` の内側リスト `<div className="flex flex-col gap-2 overflow-y-auto min-h-[80px]">` を `<div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">` に変更 (flex-1 + min-h-0 でビューポート連動)
- カラム自体の高さをビューポートに合わせるため、外側にも `flex flex-col h-full` を確保
- 「追加」ボタンは末尾固定 (現状維持)

### 4. ShortcutHint 削除

- `src/components/ShortcutHint.tsx` をファイルごと削除
- `src/App.tsx` から `import { ShortcutHint }` と `<ShortcutHint />` を削除
- ヘルプ表示は Toolbar の Keyboard ボタン → `HelpModal` のみ (既存)

### 5. テキストモード (view mode の 3 つ目)

#### ViewMode 拡張

```ts
// src/types.ts
export type ViewMode = "mindmap" | "kanban" | "text";
```

#### ViewModeToggle 拡張

`src/components/ViewModeToggle.tsx` に 3 つ目のオプション `{ value: "text", label: "text", Icon: FileText }` を追加。

#### 新規 TextEditor

`src/components/TextEditor.tsx` を新規作成。

```
┌─ TEXT ─────────────────────────────────────┐
│ ┌────────────────┐ ┌────────────────────┐  │
│ │                │ │ 買い物リスト         │  │
│ │  mindmap       │ │  ├ 牛乳              │  │
│ │    * 買い物     │ │  │ └ 期限タスク       │  │
│ │      * 牛乳     │ │  └ パン              │  │
│ │        * 期限   │ │                      │  │
│ │      * パン     │ │ ノード数: 4            │  │
│ │                │ │ エラー: なし           │  │
│ └────────────────┘ └────────────────────┘  │
│                  [リセット] [適用]            │
└────────────────────────────────────────────┘
```

- 左: textarea (`font-mono`、高さビューポート連動、`min-height: 320px`)
- 右: プレビュー
  - 成功時: パース結果の木表示 (階層つき `<ul>`、属性は小さく表示)
  - 失敗時: エラー文言 (赤字) + 空欄
  - ノード数 / エラー有無を表示
- 「適用」ボタン: パース成功時のみ活性化。クリックで確認ダイアログ後、`SET_NODES` + `RENAME_BOARD` を dispatch (既存 DslEditorModal と同じ confirm ロジック)
- 「リセット」ボタン: textarea を `serializeDSL(...)` の現在値で初期化
- `viewMode === "text"` なら App.tsx は `<TextEditor />` を表示。`<ZoomControls />` は非表示

#### DslEditorModal の削除

- `src/components/DslEditorModal.tsx` をファイルごと削除
- `src/components/DslEditorModal.test.tsx` をファイルごと削除
- `src/types.ts` の `Modal` union から `{ kind: "dsl-editor" }` を削除
- `src/components/Toolbar.tsx` から `FileText` ボタン (107-113行) と import を削除

### 6. Mermaid 形式 DSL

`src/dsl.ts` を新形式のみ対応に置き換える。旧 2 スペースインデントは **サポートしない** (YAGNI)。

#### 入力例

```
mindmap
  * Root
    * Child A @priority:high
      * Grandchild @done
    * Child B @color:sky
```

#### ルール

- 1 行目はリテラル `mindmap` (case-insensitive、空白トリム後に一致)
- 2 行目以降、各行は行頭 `*` (空白以外の前に `*` 1 個) + 任意の空白 + テキスト + 任意の属性
- インデント (行頭の空白数) で深さを判定: 0=ルート、2=子、4=孫、...
- タブインデントはエラー
- ルートはちょうど 1 行存在しなければならない
- 属性 (`@priority:high` 等) の構文は現行踏襲

#### 出力

`serializeDSL` は `mindmap\n  * Root\n    * Child ...` 形式で出力。

#### テスト

- 既存の 2 スペーステストは破棄
- 新形式の一巡 / エッジケース (空 / `mindmap` のみ / 属性混在 / 深さ不整合 / タブ) を `src/dsl.test.ts` に書き直す
- 既存 `parseInlineDSL` は **無改変** (EditModal の `@priority:high` 等の単行属性パースは DSL 本体とは別物)

## モジュール構成

### 新規ファイル

- `src/components/TaskCard.tsx` — 共通カード UI
- `src/components/TaskCard.test.tsx` — タスクカード挙動テスト
- `src/components/TextEditor.tsx` — 3 つ目の view mode 本体
- `src/components/TextEditor.test.tsx` — プレビュー・適用・エラー処理

### 変更ファイル

- `src/types.ts` — `ViewMode` に `"text"` 追加、`Modal` から `"dsl-editor"` 削除
- `src/components/ViewModeToggle.tsx` — 3 ボタン化
- `src/components/NodeCard.tsx` — TaskCard をラップする薄い実装に書き換え
- `src/components/KanbanCard.tsx` — TaskCard をラップする薄い実装に書き換え、onClick 追加
- `src/components/KanbanColumn.tsx` — flex-1 / min-h-0 / overflow-y-auto 調整
- `src/components/KanbanBoard.tsx` — h-full / overflow-hidden 調整
- `src/components/Toolbar.tsx` — FileText ボタン削除、FileText import 削除
- `src/App.tsx` — ShortcutHint 削除、viewMode === "text" で TextEditor
- `src/lib/badges.ts` — `statusDotClass` 追加
- `src/dsl.ts` — Mermaid 形式対応に書き換え
- `src/dsl.test.ts` — Mermaid 形式テストに全面差し替え

### 削除ファイル

- `src/components/ShortcutHint.tsx`
- `src/components/DslEditorModal.tsx`
- `src/components/DslEditorModal.test.tsx`

## 受け入れ条件

- `pnpm test` が全件通る
- `pnpm run check` がエラーなしで通る
- ViewModeToggle に mindmap / kanban / text の 3 ボタン
- mindmap / kanban で同じ「チェックボックス + テキスト + GitBranch + status ドット + badge」UI
- KANBAN のカード本体クリックで EditModal が開く (ドラッグと誤判定しない)
- KANBAN の各カラム内でカード数が多いとき縦スクロールが発生
- mindmap カードに status 4 色ドットが表示される
- mindmap 上に ShortcutHint オーバーレイがない
- テキストモードの左エディタに `serializeDSL` の現在値、右にプレビュー
- テキストモードで Mermaid 形式を入力 → 適用で mindmap / kanban が更新される
- 既存の EditModal / 永続化 / 検索 / ボード管理が壊れていない

## スコープ外 (YAGNI)

- 旧 2 スペース DSL の後方互換 (新形式に統一)
- テキストモードから mindmap / kanban への live link
- Mermaid 標準外の独自拡張 (例: `[[ ]]` リンク記法)
- ステータス色のカスタマイズ
- KANBAN 内インライン編集 (EditModal 起動で代替)
- ショートカットのデフォルト表記変更 (HelpModal の中身を直すのは別タスク)

## 影響範囲

| 種別 | ファイル | 影響 |
|---|---|---|
| 新規 | `src/components/TaskCard.tsx` | 共通カード UI |
| 新規 | `src/components/TaskCard.test.tsx` | タスクカードテスト |
| 新規 | `src/components/TextEditor.tsx` | 3 つ目の view mode |
| 新規 | `src/components/TextEditor.test.tsx` | テキストモードテスト |
| 変更 | `src/types.ts` | `ViewMode` 拡張 / `Modal` 縮小 |
| 変更 | `src/components/ViewModeToggle.tsx` | 3 ボタン化 |
| 変更 | `src/components/NodeCard.tsx` | TaskCard への薄いラッパ化 |
| 変更 | `src/components/KanbanCard.tsx` | TaskCard への薄いラッパ化 + onClick |
| 変更 | `src/components/KanbanColumn.tsx` | 縦スクロール対応 |
| 変更 | `src/components/KanbanBoard.tsx` | 高さ制約 |
| 変更 | `src/components/Toolbar.tsx` | FileText ボタン削除 |
| 変更 | `src/App.tsx` | ShortcutHint 削除 / TextEditor ルーティング |
| 変更 | `src/lib/badges.ts` | `statusDotClass` 追加 |
| 変更 | `src/dsl.ts` | Mermaid 形式対応 |
| 変更 | `src/dsl.test.ts` | テスト全面差し替え |
| 削除 | `src/components/ShortcutHint.tsx` | ファイル削除 |
| 削除 | `src/components/DslEditorModal.tsx` | ファイル削除 |
| 削除 | `src/components/DslEditorModal.test.tsx` | ファイル削除 |
