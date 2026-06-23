# mintodo レイアウト修正 (Kanban とサイドバーの重なり)

日付: 2026-06-24
パッケージ: `packages/mintodo`

## 背景

現状の mintodo はレイアウトに absolute positioning を多用しており、Toolbar (top-4 left-4 right-4) と BoardSidebar (left-4 top-20 bottom-4) が両方とも「浮いて」いて Kanban / Canvas のコンテンツと重なっている。

特に Kanban ビューでは最上段カードのヘッダ左側が Toolbar に、左端カラムが BoardSidebar に隠れてクリックできない。

加えて、BoardSidebar の表示・非表示を切り替える仕組みは mobile の drawer (`drawerOpen` フラグ) のみで、desktop では常に表示されるため、ボード一覧を隠してメインを広く使うことができない。

## ゴール

- Toolbar / BoardSidebar / メインコンテンツの物理的な重なりを解消する
- サイドバーを desktop でも表示・非表示できる
- 既存の mobile drawer UX は維持する
- 既存の `drawerOpen` state をそのまま流用して両対応する
- 既存の visual トーン (色、border、角丸) は保つ

## 設計

### Layout shell の再構築 (App.tsx)

現状の `flex flex-col` の中に absolute で全部置く構成をやめ、flex row でサイドバーを「押す」形にする。

```tsx
<div className="flex h-full w-full">
  {/* Sidebar: desktop では in-flow flex カラム */}
  <BoardSidebar />

  {/* Main column */}
  <div className="flex-1 relative overflow-hidden">
    <Toolbar />                    {/* absolute top-4 left-4 right-4 (現状維持) */}
    <div className="absolute inset-0 pt-20 px-4 pb-4">
      {showCanvas ? (viewMode === "kanban" ? <KanbanBoard /> : <Canvas />) : <EmptyState />}
    </div>
    <ZoomControls />                {/* bottom-4 left-4 */}
    <StatsPanel />                  {/* bottom-4 right-4 */}
    <ShortcutHint />                {/* bottom-20 */}
  </div>
</div>
```

ポイント:
- メイン column 内の toolbar / 各種 floating 要素は現状の absolute 配置を維持
- コンテンツラッパーに `pt-20 px-4 pb-4` をかけて floating toolbar の領域と余白を確保
- メイン column は `relative overflow-hidden` で内側の absolute 要素と Canvas の pan/zoom が外へはみ出さない
- ZoomControls / StatsPanel / ShortcutHint の位置は現状維持 (bottom-4 等)
- KanbanBoard 内の `paddingTop: 80px` (`2026-06-23-kanban-view-design.md` 由来) は不要になるので外す

### `drawerOpen` state の意味拡張 (store.ts)

`drawerOpen: boolean` はそのまま流用し、意味を「サイドバーが表示されているかどうか」に統一する。

- モバイル (<md): `true` → drawer overlay、 `false` → 非表示
- デスクトップ (md+): `true` → flex 240px カラムとして表示、 `false` → 非表示 (メインが全幅)

**初期値を `true` に変更**:
- 現状 `drawerOpen: false` (モバイル想定) → デスクトップで常に非表示だと board 一覧が出ないので初期不便
- デスクトップは flex column、モバイルは overlay なので、初期 `true` なら両方で見える/開いた状態になる
- モバイルで初期 `true` のままだと drawer が被って見えるが、モバイルで初回訪問時は EmptyState 等で気を取られるか、もしくはユーザーが閉じる手間を許容する (YAGNI: 画面サイズ別の初期値分岐は作らない)

### Toolbar のハンバーガー常時表示 (Toolbar.tsx)

現状のハンバーガーは `md:hidden` でモバイルのみ。これを `flex` (常時表示) に変更する。

アイコンは sidebar 開閉状態で切り替え:
- `drawerOpen === true` → `PanelLeftClose`
- `drawerOpen === false` → `PanelLeftOpen`

クリックで `TOGGLE_DRAWER` を dispatch (既存 action)。

### BoardSidebar のリファクタ (BoardSidebar.tsx)

現状は 1 つのルート要素で「desktop absolute card / mobile overlay drawer」の両方を持っている。これを「desktop では in-flow flex column」「mobile では overlay drawer」と内部で出し分ける。

既存の `sidebar` JSX 変数 (inner aside with rounded toolbar-bg look) はそのまま流用。ラップする outer 要素だけ差し替える。

```tsx
function BoardSidebar() {
  const { state, dispatch } = useMindStore();
  const actions = useBoardActions();
  const closeDrawer = () => dispatch({ open: false, type: "SET_DRAWER" });

  // ...onCreate, onRename, onDelete, onSelect は現状維持 (closeDrawer を呼ぶ)

  const sidebar = ( /* 既存の <aside> ノード、md:hidden の close ボタン込み */ );

  return (
    <>
      {/* Desktop: in-flow flex column. 非表示にしたいとき (drawerOpen === false) は md:hidden */}
      <div
        className={
          "hidden md:flex w-60 shrink-0 " + (state.drawerOpen ? "" : "md:hidden ")
        }
      >
        {sidebar}
      </div>

      {/* Mobile: overlay drawer (現状維持) */}
      {state.drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="absolute left-0 top-0 bottom-0 w-72 pt-4 pl-4 pb-4">
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}
```

ポイント:
- 既存の `sidebar` JSX 変数 (board list, create button, close button) はそのまま使う
- desktop 用の outer wrapper は `hidden md:flex w-60 shrink-0` + 条件で `md:hidden` を追加
- メイン column との区切りは wrapper 側 `border-r` ではなく sidebar 内の `aside` が元々持っている `border: 1px solid var(--border)` をそのまま使う (現状の visual tone を保つ)
- mobile 用 drawer は現状維持 (close ボタン、backdrop click で閉じる)
- board 選択時 / ボード作成 / ボード削除時の `closeDrawer` 呼び出しは mobile drawer のみを閉じる挙動だが、desktop では sidebar が常に表示されているので害はない (実質 no-op)

### KanbanBoard の padding 整理 (KanbanBoard.tsx)

`paddingTop: 80px` を削除する。代わりに親ラッパー (`App.tsx` のメイン column 内 `pt-20 px-4 pb-4` を持つ div) が toolbar 分の余白を提供する。

それ以外の `padding: 0 16px 16px` (左右下 16px) は同じ値を親から渡されるので削除する。

```tsx
// before
<div className="w-full flex-1 overflow-x-auto" style={{ padding: "80px 16px 16px" }}>
  <div className="flex gap-4 h-full">
    {columns}
  </div>
</div>

// after
<div className="w-full h-full overflow-x-auto">
  <div className="flex gap-4 h-full">
    {columns}
  </div>
</div>
```

### Canvas / EmptyState の対応

- Canvas (`w-full flex-1 cursor-grab canvas-grid relative overflow-hidden`):
  - 親が `h-full` の flex 子に変わったので `w-full h-full` で埋まる
  - 既に pan/zoom 用 `.transform-container` が absolute 配置なので影響なし
- EmptyState: 親の中央寄せで表示される。paddingTop は親が担当するので空状態は toolbar 寄りにならない

## State / Action 変更まとめ

### store.ts

```ts
// 初期値を true に変更
const createInitialState = (): State => ({
  // ...
  drawerOpen: true,  // was: false
  // ...
});
```

action 自体は変更なし (`SET_DRAWER` / `TOGGLE_DRAWER` はそのまま)。

### 新規 state / 新規 action

なし。

## 永続化

なし。`drawerOpen` は session state (永続化しない) のまま。リロードでリセットされるが、初期値が `true` なので実用上問題ない。

## テスト

### store.test.ts (追加 / 修正)

- `createInitialState()` の `drawerOpen === true` を検証

### 手動確認項目 (E2E なしなのでチェックリスト)

- [ ] desktop でロード直後、サイドバーが表示され、メインの Kanban / Canvas がサイドバー右側に配置される
- [ ] desktop でハンバーガークリック → サイドバー消滅、メインが全幅に拡大
- [ ] desktop で再度ハンバーガークリック → サイドバー復帰
- [ ] desktop で Kanban 表示時、最上段カードの左上が toolbar に隠れていない、左端カラムがサイドバーに隠れていない
- [ ] mobile (<md) でロード直後、drawer は非表示 (現状と変わらず空 state 表示)
- [ ] mobile でハンバーガークリック → drawer overlay 開、背面タップで閉じる
- [ ] mobile でボード選択 / 作成 / 削除 → drawer 自動で閉じる
- [ ] desktop ↔ mobile リサイズで状態が破綻しない (drawer open 中に desktop 化しても in-flow カラムになる、close 中に mobile 化しても overlay は出ない)
- [ ] Canvas (mindmap) で pan/zoom が壊れていない
- [ ] ZoomControls / StatsPanel / ShortcutHint の位置が toolbar と被っていない

## モジュール変更まとめ

### 変更

- `src/App.tsx`: shell を `flex flex-row` に再構成、メイン column 内に floating 要素 + コンテンツラッパーを配置
- `src/store.ts`: `createInitialState` の `drawerOpen` 初期値を `true` に
- `src/components/Toolbar.tsx`: ハンバーガーを `md:hidden` → 常時表示、開閉状態でアイコン切替
- `src/components/BoardSidebar.tsx`: desktop 用 `aside` (flex column) と mobile 用 overlay drawer を `BoardSidebarContent` で共有
- `src/components/KanbanBoard.tsx`: 内側の `padding: 80px 16px 16px` を削除 (親が担当)
- `src/store.test.ts`: `createInitialState` の `drawerOpen` 期待値を更新

### 無改変

- `src/components/Canvas.tsx` (pan/zoom 構造に影響なし)
- `src/components/EmptyState.tsx`
- `src/components/ZoomControls.tsx` / `StatsPanel.tsx` / `ShortcutHint.tsx` (位置変更なし)
- `src/components/BoardListItem.tsx` / `BoardNameDialog.tsx` / `BoardDeleteDialog.tsx`
- `src/hooks/*`
- `src/store.ts` の reducer (action 変更なし)

## 受け入れ条件

- `pnpm test` 全件 pass
- `pnpm run check` エラーなし
- desktop ロード直後、サイドバーが表示される
- desktop でハンバーガーからサイドバー表示・非表示を切替できる
- mobile の drawer UX が壊れていない
- Kanban の最上段カード・左端カードに toolbar / sidebar が被らない
- Canvas (mindmap) の pan/zoom / ノード操作が壊れていない

## スコープ外 (YAGNI)

- サイドバー幅のカスタマイズ
- サイドバー位置 (右側配置)
- サイドバー状態の永続化
- 画面サイズ別 `drawerOpen` 初期値 (両環境で同じ `true` を使う)
- Toolbar の高さ可変化
- サイドバー折りたたみ時のアイコン化 (compact mode)
- サイドバー閉じる際のアニメーション
