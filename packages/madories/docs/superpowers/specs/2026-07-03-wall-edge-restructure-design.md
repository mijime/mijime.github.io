# madories 壁データ構造再設計 + 入力系リワーク

日付: 2026-07-03

## 背景 / 問題

- 壁がセルの `top`/`left` フラグにしか保存できず、グリッド右端・下端の壁を表現できない。
- 90°回転 (`store.ts` ROTATE_FLOOR) で元 `y=0` 行の top 壁が新グリッド右端境界に移るが、`nx + 1 < newWidth` 条件で黙って消える(確定バグ)。
- 壁描画はドラッグ開始時に top/left エッジへ「ロック」する方式で、意図しない軸に張り付く・6px ヒット判定を外すと無反応・`Math.round`/`Math.floor` 混在による始点ずれがある。
- DSL 機能は良好で維持する。

## 決定(案A)

壁をセルから分離し、エッジ配列として一級データにする。入力系(壁描画)を頂点スナップ方式に書き直す。

## 新データモデル

```typescript
interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: { floorType: FloorType | null; item: Item | null }[]; // w*h, row-major
  hWalls: WallType[]; // 水平壁: width * (height+1)。index = y*width + x。y=height が下端
  vWalls: WallType[]; // 垂直壁: (width+1) * height。index = y*(width+1) + x。x=width が右端
}
```

- `WallFlags` 型と `Cell.wall` は削除。
- `hWalls[y*w+x]` はセル (x,y) の上辺(y=h 行は最下段セルの下辺)。
- `vWalls[y*(w+1)+x]` はセル (x,y) の左辺(x=w 列は最右セルの右辺)。

### 回転 (CW90)

- セル: `(x,y) → (h-1-y, x)`、幅高さスワップ(現行どおり)。
- 壁: `vWalls[y][x] → hWalls'[x][h-1-y]`(左辺→上辺)、`hWalls[y][x] → vWalls'[x][h-y]`。純粋な添字並べ替えで欠落なし。プロパティテスト(4回回転 = 恒等)で保証する。

## 入力系リワーク(壁描画)

- ヒット対象を「グリッド頂点」に変更: pointer down で最寄り頂点にスナップ(閾値なし、常に最寄り)。
- ドラッグ中は現在位置の最寄り頂点との軸整列セグメント(dx/dy の大きい方の軸)をプレビュー表示。
- pointer up で始点頂点〜終点頂点間のエッジ列を SET_WALL。エッジロック概念は廃止。
- 既存の壁の上をなぞって消す操作は「消しゴム壁タイプ(none)」選択時に同じジェスチャで行う(現行踏襲)。

## DSL

- 構文は現状維持: `wall (x,y)-(x2,y2) top|left <type>`。
- 追加: `right` / `bottom` 側指定を受け付ける(右端・下端の壁を表現するため)。シリアライザは内部で top/left に正規化できないエッジ(x=w, y=h)のみ right/bottom で出力。
- パーサ/シリアライザ内部をエッジ配列にマップ。round-trip テスト維持。

## 永続化 / 共有

- SaveData version 2。v1 読み込み時に `cell.wall.top → hWalls`、`cell.wall.left → vWalls` へ変換(欠落なしの単純写像)。
- 共有 URL は DSL テキスト経由なので構文互換により旧 URL もそのまま読める。

## 影響範囲

- 書き直し: `types.ts`, `store.ts`, `input/wall-logic.ts`, `input/hit-test.ts`, `components/hooks/use-pointer-handlers.ts`, `draw/draw-walls.ts`
- 追従: `floor/dsl.ts`, `floor/room-detection.ts`, `floor/clipboard-logic.ts`, `floor/share.ts`, `storage.ts`(v1→v2 移行), `draw/export.ts`, 3D プレビューの壁参照
- テスト: 既存 vitest を新構造で書き直し。回転の恒等プロパティテストを追加。

## 対象外

- UI 全面リライト、DSL 構文の大幅変更、新機能追加。
