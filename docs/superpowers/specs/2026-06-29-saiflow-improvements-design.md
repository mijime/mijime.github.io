# saiflow 改善: 子供年齢入力・グループ名編集・対数グラフ

## 1. 子供フォーム: 年齢入力を子供の年齢に変更

**ファイル**: `packages/saiflow/src/components/AddEventModal.tsx`

### 現状
- `ChildForm` 内の「誕生」欄で `YearInput` コンポーネントを使用
- `YearInput` の `"age"` モードでは親の `currentAge` を基準に表示（親の年齢）
- 例: 親が39歳、birthYear=2 なら「41歳」と表示される

### 修正後
- `"age"` モード時は**子供自身の年齢**を表示/入力する
- 子供がシミュレーション開始時に5歳 → 「5歳」と入力 → `birthYear = -5`
- 子供がまだ生まれていない → 年数モードで「2」→ 2年後に誕生（現状通り）
- `birthYear` が生活費・教育費の開始年計算の基点なので、負の値も `Math.max(0, yrStart)` で適切に処理される

### 実装
- `ChildForm` 内で `YearInput` の代わりに独自の年齢/年数切り替えUIを使用する
- `"age"` モード: `display = childCurrentAge`, `onChange` → `birthYear = -childCurrentAge`
- `"offset"` モード: 現状通り

## 2. グループ名: ダブルクリックでインライン編集

**ファイル**: `packages/saiflow/src/components/GuiEditor.tsx`

### 現状
- グループヘッダーにグループ名が表示されているが編集不可
- 折りたたみ/展開、グループ削除、イベント追加のみ可能

### 修正後
- グループ名部分をダブルクリックでインライン `<input>` に切り替え
- Enter または blur で編集確定 → 対象グループに属する**全イベント**の `group` フィールドを新しい名前に更新
- Escape でキャンセル（元の名前に戻す）
- 空文字の場合は `undefined` 扱い（グループ解除）

### 実装
- `editingGroup` ステート（編集中のグループ名）と `editValue` ステート（編集中の値）
- `renderGroupHeader` 内で分岐
- `update()` 経由で全イベントの `group` を置換:
  ```ts
  events: s.events.map((ev) =>
    ev.group === oldName ? { ...ev, group: newName || undefined } : ev
  )
  ```

## 3. 収支グラフ: 対数スケール + 共通Y軸

**ファイル**: `packages/saiflow/src/components/BarChart.tsx`

### 現状
- 収入と支出で独立したスケール（`maxIncome` / `maxExpense`）
- 線形スケールのため、収入1万・支出1000万のようなケースで収入が見えなくなる

### 修正後
- 収入・支出で**共通の最大値** `maxVal = Math.max(maxIncome, maxExpense)` を使用
- Yマッピングに対数スケール適用:
  ```
  scale(v) = log10(v + 1) / log10(maxVal + 1)
  incomeY(v) = midY - scale(v) * plotH
  expenseY(v) = midY + scale(v) * plotH
  ```
- 目盛り: 10の累乗で生成（1, 10, 100, 1000, 10000, ...）、`maxVal` 以下の値のみ
- 値が0の年も `log10(1) = 0` で適切に処理される

### 実装
- `niceStep` / `ticks` 関数を対数スケール用の目盛り生成に置き換え:
  ```ts
  function logTicks(max: number): number[] {
    const ticks: number[] = [];
    for (let i = 0; i <= Math.floor(Math.log10(max + 1)); i++) {
      const v = 10 ** i;
      if (v <= max) ticks.push(v);
    }
    return ticks;
  }
  ```
- 収入・支出のYマッピングを `scale(v)` 経由に統一
- 凡例やツールチップは変更なし
