# mintodo Toolbar を in-flow 化 (レイアウト整列)

日付: 2026-06-24
パッケージ: `packages/mintodo`

## 背景

現状の mintodo では Toolbar を `absolute top-4 left-4 right-4 z-10` で配置しており、16px のマージンを取って「浮いている」状態になっている。

これにより以下の視覚的な不整合が発生している:
- サイドバーの左端は x=0
- Toolbar の左端は x=16 (main column の内側)
- サイドバーと Toolbar の左端ラインが揃わない → ユーザーから「ガタガタしている」との指摘
- 同様に Toolbar の右端 (x=screen-16) と、コンテンツの右端 (main column - 16px padding) は揃うが、サイドバーとは揃わない

`2026-06-24-mintodo-layout-overlap-design.md` で「ヘッダは floating (option A)」を選んだのは Toolbar と Kanban の「重なり」を直すためだったが、これにより別の整列問題が生じている。

## ゴール

- Toolbar を absolute floating から外し、main column 内の in-flow flex row にする
- サイドバーの左端 (x=0) と Toolbar の左端 (x=240、サイドバー右端) が「揃う」ラインになるよう、レイアウトを整える
- 既存の重なり修正 (サイドバーが flex column、Kanban が toolbar の下) は維持
- 既存の mobile drawer UX は維持
- Kanban モードでは ZoomControls を非表示にする (mindmap のみ)

## 設計

### App.tsx: main column を flex column に

```tsx
<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
  <Toolbar />
  <div className="flex-1 relative p-4">
    {showCanvas ? (state.viewMode === "kanban" ? <KanbanBoard /> : <Canvas />) : <EmptyState />}
    {state.viewMode === "mindmap" && <ZoomControls />}
    <StatsPanel />
    <ShortcutHint />
  </div>
</div>
```

ポイント:
- `flex-1 flex flex-col` で main column を縦flexに
- `min-h-0` で flex 子の overflow を正しく効かせる (flex デフォルトの `min-height: auto` だと shrink せず overflow するため)
- `overflow-hidden` を維持
- 上の row: `<Toolbar />` (in-flow、高さは内容依存)
- 下の row: `<div className="flex-1 relative p-4">` で残りの高さを取り、Canvas / Kanban / EmptyState を入れる
- 浮いている要素 (ZoomControls / StatsPanel / ShortcutHint) は content area の中に置く (元と同じ absolute 配置、`bottom-4` などは content area の底辺基準)
- content area の `pt-20` は不要 (Toolbar が in-flow なので)

### Toolbar.tsx: absolute 削除、border-b で区切り

```tsx
<header
  className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 border-b"
  style={{ background: "var(--toolbar-bg)", borderColor: "var(--border)" }}
>
```

ポイント:
- `absolute top-4 left-4 right-4 z-10` を削除
- `rounded` を削除 (full-width バーになるため角丸不要)
- `border-b` でコンテンツとの境界線のみ残す
- `borderColor: "var(--border)"` を inline style で設定 (既存の border カラー変数を再利用)
- 既存の `flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4` 構造は維持
- 既存の background `var(--toolbar-bg)` は維持
- 既存の `transition` 系クラスは前回コミット (`1e08709`) で削除済み

### KanbanBoard / Canvas / EmptyState: 変更なし

- `KanbanBoard` の outer は `w-full h-full overflow-x-auto` (前回 `flex-1` → `h-full` 化済み) → flex column の子として高さが決まるので問題なし
- `Canvas` も `w-full h-full ...` (前回 `flex-1` → `h-full` 化済み) → 同上
- `EmptyState` は content area 内で中央寄せされる

## State / Action 変更

なし。`drawerOpen` フラグの意味、reducer、各 action 全て無改変。

## 永続化

なし。

## 視覚変化

### Before (現状)
```
┌──────────────────────────────────────────┐
│ ┌─ Toolbar (absolute, 16px margin) ───┐ │
│ │  ← サイドバー左端 (0) と 16px ずれてる│
│ └──────────────────────────────────────┘ │
│ ┌────┐ ┌──────────────────────────────┐  │
│ │Side│ │ Main column                  │  │
│ │bar │ │ ┌─ Toolbar floats here ────┐ │  │
│ │240 │ │ └─────────────────────────┘ │  │
│ │    │ │ ┌─ Content (pt-20) ───────┐ │  │
│ │    │ │ │                         │ │  │
│ └────┘ └──────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### After
```
┌────┐ ┌──────────────────────────────────┐
│Side│ │ Toolbar (in flow, no margin)    │ ← メイン column 左端に揃う
│bar │ ├──────────────────────────────────┤
│    │ │ Content (p-4)                   │
│240 │ │                                  │
│    │ │                                  │
└────┘ └──────────────────────────────────┘
```

- Toolbar の左端 = main column の左端 = サイドバー右端 (x=240)
- Toolbar の右端 = main column の右端 = 画面右端
- 浮いている要素なし、すべてのラインが rectilinear に揃う
- サイドバーは full-height、Toolbar は main column 内のみ
- Kanban / Canvas は Toolbar の真下から始まる (16px padding あり)

## テスト

### store.test.ts: 変更なし
### component tests: 変更なし

新レイアウトは既存テスト範囲 (state / reducer / DSL / integration) には影響しない。`pnpm test` 全 237 件通過を引き続き期待。

### 手動確認 (E2E なし)

- [ ] desktop でロード直後、Toolbar がサイドバー右端から画面右端までを占める
- [ ] Toolbar の左端と main column の左端が揃う (16px ずれない)
- [ ] Kanban / Canvas は Toolbar の真下から始まり、Toolbar に重ならない
- [ ] Toolbar の高さは内容依存 (~68px on desktop、複数行 on mobile)
- [ ] desktop でハンバーガークリック → サイドバー消滅、main column が全幅、Toolbar も全幅になる
- [ ] mobile drawer UX 不変
- [ ] ZoomControls / StatsPanel / ShortcutHint の位置は Toolbar と被らない (引き続き content area 内)
- [ ] mindmap モードでは ZoomControls が表示される
- [ ] Kanban モードでは ZoomControls が表示されない
- [ ] Canvas (mindmap) の pan/zoom / ノード操作 不変
- [ ] EmptyState (ボード未作成時) は content area 内で中央寄せ

## モジュール変更まとめ

### 変更

- `src/App.tsx` — main column を `flex flex-col min-h-0 overflow-hidden` に、content area を `flex-1 relative p-4` に、浮いている要素を content area 内へ移動
- `src/components/Toolbar.tsx` — `absolute top-4 left-4 right-4 z-10 rounded` を削除、`border-b` を追加

### 無改変

- `src/store.ts` / `src/store.test.ts`
- `src/components/BoardSidebar.tsx`
- `src/components/KanbanBoard.tsx`
- `src/components/Canvas.tsx`
- `src/components/EmptyState.tsx`
- `src/components/ZoomControls.tsx` (参照のみ、表示制御は App.tsx で行うため)
- `src/components/StatsPanel.tsx` / `ShortcutHint.tsx`
- 全ての hooks / lib

## 受け入れ条件

- `pnpm test` 全 237 テスト通過
- `pnpm run check` type check + lint エラーなし
- desktop で Toolbar がサイドバー右端と画面右端に揃う
- Toolbar がどの要素とも重ならない
- Kanban / Canvas が Toolbar の真下から始まる
- 既存の mobile drawer UX / サイドバー toggle / Canvas pan-zoom が壊れない

## スコープ外 (YAGNI)

- Toolbar の高さカスタマイズ
- Toolbar を画面上部に固定 (スクロール時 sticky)
- Toolbar の折り畳みモード
- サイドバーと Toolbar の境界線のスタイル変更
- レスポンシブブレークポイントの調整
