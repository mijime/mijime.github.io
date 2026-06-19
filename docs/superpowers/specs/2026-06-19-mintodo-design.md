# mintodo: マインドマップ ToDo パッケージ

## 概要

`packages/mintodo` を新規作成し、ブラウザで動作するマインドマップ形式の ToDo アプリケーションを React + TypeScript で実装する。元は単一 HTML ファイル（Tailwind CDN + FontAwesome + バニラ JS）として書かれていたものを、既存のパッケージ構成（madories と同じ規約）に統合する。

## ゴール

- 元 HTML の機能・見た目を忠実に再現
- 既存パッケージと同じビルド・テスト・lint 規約に揃える
- `apps/main` から `client:only="react"` でマウントできる形にする
- 単体テスト可能な構造にする

## 機能

### データモデル

ノードはツリー構造で、各ノードは `MindNode` 型で表現する。

```ts
type Priority = "low" | "medium" | "high";
type CategoryColor = "slate" | "sky" | "emerald" | "rose";

interface MindNode {
  id: string;
  text: string;
  parentId: string | null;  // isRoot のとき null
  isRoot: boolean;
  completed: boolean;
  collapsed: boolean;
  priority: Priority;
  categoryColor: CategoryColor;
  dueDate: string;          // ISO 8601 (YYYY-MM-DD)、空文字列許容
  children: string[];       // 子ノード ID の配列
  x: number;                // 物理シミュレーション用座標
  y: number;
  vx: number;               // 速度
  vy: number;
}
```

ルートノードは `id: "root"`、`isRoot: true` で固定。

### 永続化

- `localStorage` キー: `mintodo_state` に `{ version: 1, nodes: Record<string, MindNode> }` を保存
- 物理速度 `vx, vy` は保存対象外（初期化時に 0 へ）
- JSON インポート / エクスポート: `version: 1, nodes` 形式
- 破損データ / バージョン不一致 / 形状不正は握りつぶして初期データにフォールバック

### 機能一覧

| 機能 | ショートカット | 備考 |
|------|----------------|------|
| 子ノード追加 | `Tab` | 親ノードを選択中に新規ノードを作成・編集モーダル表示 |
| 兄弟ノード追加 | `Enter` | 親に新規ノードを追加 |
| 編集 | `E` | 選択ノードの編集モーダル表示 |
| 完了トグル | `Space` | ルートは対象外、子は再帰的にカスケード |
| 削除 | `Delete` / `Backspace` | 確認ダイアログ後、ノードと子孫を全削除 |
| 折りたたみ | ノード内ボタン | 子を一時非表示 |
| 選択移動 | 矢印キー | 簡易ツリートラバース |
| 検索 | ヘッダ入力 | マッチしないノードは半透明化 |
| 未完了のみ表示 | ヘッダトグル | 完了ノードを非表示 |
| 自動配置トグル | ヘッダトグル | 物理シミュレーション ON/OFF |
| キャンバスパン | ドラッグ | 背景を掴んで移動 |
| キャンバスズーム | ホイール | 0.2x 〜 3x にクランプ |
| ノードドラッグ | ノードドラッグ | 物理速度をリセット |
| JSON エクスポート | ヘッダボタン | `mintodo_backup_<date>.json` |
| JSON インポート | ヘッダボタン | ファイル選択ダイアログ |
| テーマ切替 | ヘッダボタン | `dark` クラス切替 |
| 全体表示 | 左下ボタン | pan/zoom をリセット |
| 進捗表示 | 右下パネル | 完了/総数、進捗バー |

## パッケージ構成

```
packages/mintodo/
├── .oxfmtrc.json
├── .oxlintrc.json          # extends ../../.oxlintrc.json
├── .gitignore
├── CLAUDE.md               # bun / oxlint / oxfmt / tsgo / vite を記載
├── index.html              # Vite エントリ (#root マウント)
├── package.json            # @mijime/mintodo
├── tsconfig.json           # madories と同じ compilerOptions
├── vite.config.ts          # React プラグイン + tailwindcss プラグイン
└── src/
    ├── main.tsx            # createRoot(document.querySelector("#root")!)
    ├── App.tsx             # MindProvider で包む
    ├── index.css           # @import "@mijime/theme/index.css"; @import "tailwindcss";
    ├── types.ts            # MindNode, SaveData, Priority, CategoryColor, View
    ├── store.ts            # reducer + Action + createInitialNodes()
    ├── store.test.ts
    ├── storage.ts          # load/save ToStorage + ToFile
    ├── storage.test.ts
    ├── components/
    │   ├── Toolbar.tsx
    │   ├── Canvas.tsx
    │   ├── NodeCard.tsx
    │   ├── ConnectionLines.tsx
    │   ├── EditModal.tsx
    │   ├── HelpModal.tsx
    │   ├── StatsPanel.tsx
    │   ├── ZoomControls.tsx
    │   └── ShortcutHint.tsx
    └── hooks/
        ├── use-mind-store.ts
        ├── use-physics.ts
        ├── use-keyboard.ts
        ├── use-pan-zoom.ts
        ├── use-drag-node.ts
        └── use-storage-sync.ts
```

## アーキテクチャ

### 状態管理

`useReducer` + Context。madories と同じパターン。

```ts
interface State {
  nodes: Record<string, MindNode>;
  view: { pan: { x: number; y: number }; zoom: number };
  selectedNodeId: string;
  searchQuery: string;
  hideCompleted: boolean;
  physicsEnabled: boolean;
  draggingNodeId: string | null;
  modal: { kind: "edit"; nodeId: string } | { kind: "help" } | null;
}

type Action =
  | { type: "ADD_CHILD"; parentId: string }
  | { type: "UPDATE_NODE"; id: string; patch: Partial<MindNode> }
  | { type: "TOGGLE_COMPLETE"; id: string }
  | { type: "TOGGLE_COLLAPSE"; id: string }
  | { type: "DELETE_NODE"; id: string }
  | { type: "MOVE_NODE"; id: string; x: number; y: number }
  | { type: "SET_NODES"; nodes: Record<string, MindNode> }
  | { type: "SET_VIEW"; view: State["view"] }
  | { type: "SELECT"; id: string }
  | { type: "SET_SEARCH"; query: string }
  | { type: "TOGGLE_HIDE_COMPLETED" }
  | { type: "TOGGLE_PHYSICS" }
  | { type: "OPEN_MODAL"; modal: State["modal"] }
  | { type: "RESET" };
```

`ADD_CHILD` の action では `state.nodes[newId] = newNode; parent.children.push(newId); selectedNodeId = newId;` までを実行する。`OPEN_MODAL` action は別途 dispatch する。実装は `useMindStore` hook で `dispatch` をラップし、副作用（モーダル開閉、localStorage 同期など）は hook 層で行う。

### 物理シミュレーション

`usePhysics` フックで `requestAnimationFrame` ループ。`state.physicsEnabled` のときだけ動作。

**元 HTML のパラメータを移植:**
- 斥力係数: 1800
- ばね係数: 0.055
- 自然長: 190
- 減衰: 0.85
- 適用範囲: 300px 以内のノードペア

**実装方針:**
- 力学は `state.nodes[*].vx, vy` を直接 mutate（`useRef` 保持の最新 state を使う）
- ノード位置を `useState` ではなく ref 経由で更新 → 再レンダリング抑制
- 位置が変わったノードだけ `style.left/top` を DOM 上で直接更新
- 線が動いたら `ConnectionLines` を再描画（force update）
- ルートノードとドラッグ中のノードは位置固定
- 完了済み・hideCompleted ノードは反発計算から除外

### キーボードショートカット

`useKeyboard` フックで `window.addEventListener("keydown", ...)`。元 HTML の `handleKeyDown` を完全移植。

- モーダル表示中・検索入力フォーカス時は無効（Escape だけ有効）
- 矢印キーでの選択移動は `children[0]` / 前の兄弟 / 親 の優先順位で遷移

### キャンバスパン・ズーム

`usePanZoom` フックで canvas 要素の mouse / touch / wheel を処理。
- pan: `transform: translate(${pan.x}px, ${pan.y}px)`
- zoom: `transform: ... scale(${zoom})`
- transform-origin: 0 0（左上基準）
- 物理シミュレーション座標は `centerX + node.x * zoom + pan.x` で画面座標に変換

### ノードドラッグ

`useDragNode` フックで mouse / touch を処理。
- ボタンや完了トグルアイコン上での mousedown はドラッグ対象外
- ドラッグ中は物理速度を 0 に
- 移動量は `(clientX - startX) / zoom` で論理座標に換算

### 永続化

`useStorageSync` フックで `nodes` の変更を 300ms デバウンスして `localStorage` へ保存。
インポート / エクスポートは `storage.ts` の純粋関数で扱い、フックでトリガー。

### 描画戦略

- ノードは React ツリーに展開（条件: hideCompleted, parentCollapsed, isMatch）
- 接続線は SVG で 1 つの `<svg>` に全 `<path>` を再描画
- ノード DOM には `id="node-dom-${id}"` を付与し、physics loop から直接位置更新できるようにする
- ノード `selected` 状態: 親に state を持たせず、`state.selectedNodeId` から `data-` 属性で表現

## データフロー

```
        ┌─────────────────────────────────────────┐
        │  MindProvider (useReducer + Context)    │
        └────┬───────────────┬────────────┬───────┘
             │               │            │
        ┌────▼────┐     ┌────▼────┐   ┌───▼────┐
        │ Toolbar │     │ Canvas  │   │ Modals │
        └─────────┘     └────┬────┘   └────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
         │NodeCard │    │NodeCard │    │NodeCard │  ← physics loop が left/top を直接更新
         └─────────┘    └─────────┘    └─────────┘
              │
              └──→ usePhysics (rAF loop, state.nodes を mutate)
```

## テスト

- `store.test.ts`: reducer の純粋関数テスト
  - `ADD_CHILD`: 親に追加、子ノード作成、`selectedNodeId` 更新
  - `UPDATE_NODE`: 部分更新
  - `TOGGLE_COMPLETE`: 自身と子孫を再帰的にカスケード
  - `TOGGLE_COLLAPSE`: フラグ反転
  - `DELETE_NODE`: 親の子リストから削除、自身と子孫を state から削除
  - `RESET`: 初期データに置き換え
- `storage.test.ts`: localStorage / File API の往復（madories と同じパターン）
- コンポーネントテストは今回スコープ外（物理・ドラッグなど E2E 寄りのため）

## 採用しない機能（YAGNI）

- バックエンド・クラウド同期
- 共同編集
- 複数ドキュメント
- Undo/Redo（元 HTML にもない）
- ノードのリサイズ・折り返し
- タグ・複数期日
- Storybook（既存パッケージにもない）

## 決定事項

- 2026-06-19: ユーザー承認済み
- スタイリング: Tailwind utility class
- アイコン: lucide-react
- 状態管理: useReducer + Context
- 開発: Vite dev server
