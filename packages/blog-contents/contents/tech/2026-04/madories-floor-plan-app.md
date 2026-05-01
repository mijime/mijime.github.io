---
CreatedAt: "2026-04-30T00:00:00+09:00"
IsDraft: false
Title: "madories - ブラウザで動く間取り図エディタを作った"
Description: "Canvas ベースの間取り図エディタ madories の設計と実装。DSL によるテキスト表現・室検出・URL 共有などの仕組みを紹介する。"
Tags: ["react", "canvas", "floor-plan", "madories"]
---

間取り図をブラウザで編集できるツール **madories** を作った。

<!--more-->

## 概要

madories はグリッドベースの間取り図エディタ。壁・床材・家具を配置して間取りを作れる。サーバー不要で、データは URL に圧縮して共有できる。

## データ構造

間取りは `Building` → `FloorPlan` → `Cell` のツリーで表現する。

```ts
interface Cell {
  wall: { top: WallType; left: WallType };
  floorType: FloorType | null;
  item: Item | null;
}

interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: Cell[]; // width * height の1次元配列
}
```

セルは2次元グリッドを1次元配列に flatten して持つ。壁はセルの上辺・左辺にのみ持たせることで重複を避けている。

## テキスト DSL

間取りをテキストとして表現する DSL を実装した。セルの状態を記号で表し、人間が読み書きできる形式にしている。URL 共有・クリップボードコピーはこの DSL を介して行う。

複数フロアは `---` セパレータで連結する。

```
1F
...
---
2F
...
```

## URL 共有

DSL テキストを gzip 圧縮 → base64url エンコードして URL クエリパラメータ `?d=` に載せる。Web Streams API (`CompressionStream`) だけで実装しているためサーバー不要。

```ts
async function compress(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const stream = new CompressionStream("gzip");
  // ...
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
```

## 室検出と畳数計算

塗られた床セルを BFS でグループ化し「室」を検出する。各室の畳数・形状の単純さ（L字かどうか等）を算出して凡例に表示する。

形状判定はグリッドコーナーの頂点数をカウントする方法を使った。コーナーを共有するセルが 1 または 3 個なら頂点、という規則で多角形の頂点数を O(n) で求められる。

```ts
// 頂点数 4 = 矩形、それ以上 = 凸でない形状
const isSimple = countVertices(room.cells, width) === 4;
```

## Canvas 描画

`<canvas>` に直接描画している。床矩形は貪欲法で最大矩形にパックしてから描画することで、セル単位の細かい描画を避けてパフォーマンスを確保している。

## 状態管理

useReducer ベースの store で Action を dispatch する設計。undo/redo は Action 履歴スタックで実装した。localStorage への自動保存も store レイヤーで行う。

## ツール

| ツール     | 操作                                 |
| ---------- | ------------------------------------ |
| 壁         | セル境界をドラッグして壁種別を設定   |
| 床         | セルをドラッグして床材を塗る         |
| 家具       | パレットから選択してセルに配置・回転 |
| 選択       | 範囲選択してコピー・ペースト         |
| 塗りつぶし | 室単位で床材を一括変更               |

## まとめ

- グリッドセルの1次元配列 + 上/左壁フラグ でシンプルなデータ構造
- テキスト DSL + gzip + base64url でサーバーレス URL 共有
- BFS 室検出 + 頂点カウントで畳数・形状を自動算出
- Canvas 描画 + 矩形パッキングでパフォーマンス確保
