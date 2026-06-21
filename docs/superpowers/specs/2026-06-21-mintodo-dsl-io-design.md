# mintodo DSL I/O デザイン

日付: 2026-06-21
パッケージ: `packages/mintodo`

## 目的

mintodo のボード内容を、Markdown ライクな DSL でエクスポート/インポートできるようにする。位置情報 (x, y, vx, vy) は保存せず、YAML 風のインデントで親子関係と属性を表現する。既存の JSON I/O は変更しない。

## DSL 文法

### サンプル

```markdown
# コメント (YAML 互換)
買い物リスト                  ← ルート行 = ボード名 (indent 0)
  牛乳 @priority:high         ← indent 2 で子ノード
    低脂肪 @color:sky         ← indent 4 で孫ノード
  パン @due:2026-06-25
  バター @done @color:emerald ← @done で完了フラグ
  # 空行は無視
  チーズ
```

### ルール

| 項目 | 仕様 |
|---|---|
| 行の終端 | LF (CRLF も許容し LF として扱う) |
| 1 行 | 1 ノード。`text` の後に任意個の `@key:value` 属性をスペース区切りで続ける |
| テキスト | 属性と `[` を除いた先頭トークンを除く全テキスト (スペースを含む) |
| ルート | indent 0 の最初の有効行。テキスト = ボード名かつ root ノード |
| indent 単位 | 半角スペース 2 個。タブはエラー |
| インデント差分 | 連続する 2 行間の indent 差は 0 または 2 スペース。それ以外はエラー |
| コメント | `#` で始まり改行まで。行頭のみ (YAML と同様の inline コメントは非対応) |
| 空行 | 無視 |
| 認識属性 | `@priority` / `@color` / `@due` / `@done` |
| `@priority` | 値域: `low` \| `medium` \| `high`。範囲外はエラー |
| `@color` | 値域: `slate` \| `sky` \| `emerald` \| `rose`。範囲外はエラー |
| `@due` | 値: `YYYY-MM-DD`。不正フォーマットはエラー |
| `@done` | 値なし (フラグ的存在)。同じ行に再度出現しても上書き |
| 未知属性 `@*:*` | パース時は無視 (将来の拡張余地) |
| 空テキスト | エラー (少なくとも 1 文字必要) |
| 位置情報 | 保存対象外 (x, y, vx, vy は失われる) |

### エラーケース (parse 失敗 → `null` 返却)

- ルート行 (indent 0) がない
- タブ文字が含まれる
- インデントが 2 の倍数でない
- 連続行で indent が意図せず戻る (1 段減る場合は OK、2 段以上減るのはエラー)
- テキストが空
- `@priority` / `@color` の値域外
- `@due` の日付フォーマット不正

## モジュール構成

### 新規ファイル

#### `src/dsl.ts` (~150 行)

純粋関数のDSL処理モジュール。React・DB 非依存。

```ts
export interface DslBoard {
  id: string;
  name: string;
}

export interface DslParseResult {
  board: DslBoard;
  nodes: MindNode[];
}

export function parseDSL(text: string, boardId: string): DslParseResult | null
export function serializeDSL(board: { name: string }, nodes: Record<string, MindNode>): string
```

- `parseDSL`: 失敗時 `null` 返却 (既存 `parseImportedJson` と一貫)
- `serializeDSL`: ルートノードを indent 0 として再帰的に出力。属性は `priority` → `color` → `due` → `done` の固定順
- `x, y, vx, vy`: すべて `0` で生成 (物理シミュレーションが再計算する)

#### `src/dsl.test.ts`

vitest による単体テスト。

- パース OK: シンプル / コメントあり / 空行あり / 属性あり / 深いネスト / ルートのみ
- パース NG: タブ / 不正 priority / 不正 color / 不正 due / 空テキスト / 非 2 スペース indent / ルート欠如
- ラウンドトリップ: serialize → parse → serialize で同じ出力
- シリアライズ出力の安定性: 属性順、インデント

### 変更ファイル

#### `src/components/Toolbar.tsx`

JSON Export / Import ボタンの隣に 2 ボタン追加。lucide-react から `FileText` (export) と `FileUp` (import)。

- ハンドラ `onExportDsl` / `onImportDsl` を追加
- 既存 `onExport` (JSON) / `onImport` (JSON) は無改変
- `accept=".md"` の file input を追加 (既存 `.json` と並列)
- Import 成功時は **ボード名も上書き** する (`useBoardActions().renameBoard` を await)

#### `src/storage.ts`

汎用ヘルパー `downloadText` を追加 (既存 `downloadJson` の text 汎用版)。

```ts
export function downloadText(text: string, filename: string, mime: string): string
```

#### `src/hooks/use-board-actions.ts`

変更なし (既存 `renameBoard` を使用)。

## 動作詳細

### Export

```
1. ユーザーが [DSL Export] クリック
2. serializeDSL(currentBoard, state.nodes) で文字列生成
3. downloadText(text, `mintodo_${boardName}_${date}.md`, "text/markdown")
4. ブラウザがダウンロード開始
```

### Import

```
1. ユーザーが [DSL Import] クリック → ファイルピッカー (.md)
2. ファイル読み込み (file.text())
3. parseDSL(text, currentBoardId) を呼ぶ
4. null なら alert でエラー通知し return
5. 現在のノードが存在する場合 confirm() で上書き確認
   - キャンセルなら e.target.value = "" して return
6. actions.renameBoard(currentBoardId, parsed.board.name) を await
7. dispatch({ type: "SET_NODES", nodes: arrayToRecord(parsed.nodes) })
8. e.target.value = "" (次回の同ファイル選択を許可)
```

## スコープ外

- DSL ⇄ JSON 変換機能
- 複数ボード対応 (1 DSL = 1 ボード)
- リアルタイムプレビューエディタ
- 未知属性の保存 (破棄される)
- インラインコメント (`text # comment`)

## 影響範囲

| 種別 | ファイル | 影響 |
|---|---|---|
| 新規 | `src/dsl.ts` | 純粋関数の DSL 処理 |
| 新規 | `src/dsl.test.ts` | 単体テスト |
| 変更 | `src/components/Toolbar.tsx` | ボタン 2 つ + ハンドラ追加 |
| 変更 | `src/storage.ts` | `downloadText` ヘルパー追加 |
| 無改変 | `src/types.ts` | 新規型不要 |
| 無改変 | `src/store.ts` | 新規 Action 不要 (既存 `SET_NODES` / `RENAME_BOARD` を流用) |
| 無改変 | `src/db.ts` | DB 変更なし |
| 無改変 | 既存 JSON I/O 機能 | 完全互換維持 |

## 受け入れ条件

- `pnpm test` が全件通る
- `pnpm run check` がエラーなしで通る
- 既存 JSON Export / Import が壊れていない
- 以下の操作が手動で動作する:
  - DSL Export → ダウンロードした `.md` をテキストエディタで開いて読める
  - DSL Import → ルート行がボード名になり、ネストが MindMap に反映される
  - `@priority`, `@color`, `@due`, `@done` がノードに正しく反映される
  - 不正 DSL は alert で拒否される
