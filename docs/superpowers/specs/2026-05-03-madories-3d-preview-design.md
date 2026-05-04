# madories 3Dプレビュー機能設計書

**日付:** 2026-05-03
**ステータス:** 設計承認済み

## 概要

madories（ブラウザベース間取りエディタ）に、React Three Fiber（R3F）を用いた3Dプレビュー機能を追加する。ユーザーは2D編集画面と3Dプレビュー画面を切り替えて、間取りを鳥瞰図で回転・拡大して確認できる。

## 背景・目的

- 2Dの間取り図だけでは空間のつながりや部屋の配置がイメージしにくい場面がある
- 壁と床を3Dで確認できれば、設計段階での認識齟齬を減らせる
- 編集は2D画面で行い、確認は3D画面で行うという分離されたワークフローを提供する

## 要件

### 機能要件

1. **表示モード切り替え**
   - 2D編集画面と3Dプレビュー画面をツールバーボタンで切り替える
   - 3Dプレビューは編集不可（閲覧専用）

2. **3D表示内容**
   - 壁：厚みなしの板（PlaneGeometry）として表示
   - 床：`floorType` に応じた色・質感のタイルを表示
   - 家具：今回は非表示（将来拡張の余地を残す）
   - 表示対象階：現在選択中の階のみ

3. **操作**
   - ドラッグ（1本指）で水平方向回転
   - マウスホイール / ピンチで拡大縮小
   - 見下ろし角度は45°固定
   - パン（移動）は無効

4. **スマホ対応**
   - タッチ操作に対応（ピンチズーム、1本指ドラッグ回転）
   - 小画面でも全体が見えるよう最小距離を調整

### 非機能要件

- バンドルサイズ：コード分割（dynamic import）により、2D編集画面の初回ロードに影響を与えない
- パフォーマンス：20×20セル程度の間取りで60fps維持
- ダークモード対応：3Dシーンの背景色・マテリアルがダークモードに追従する

## アーキテクチャ

```
packages/madories/src/
├── components/
│   ├── App.tsx              # viewMode状態管理、2D/3D切り替え
│   ├── floor-canvas.tsx     # 既存：2D編集キャンバス
│   └── preview-3d/          # 新規：3Dプレビュー
│       ├── index.tsx        # Preview3D（React.lazy用ラッパー）
│       ├── scene.tsx        # FloorPlanScene（R3F Canvas内シーン）
│       ├── camera.tsx       # PreviewCamera（制限付きOrbitControls）
│       ├── lighting.tsx     # ライティング設定
│       └── meshes/
│           ├── floor-mesh.tsx   # 床タイルメッシュ
│           └── wall-mesh.tsx    # 壁セグメントメッシュ
├── floor/
│   └── geometry-3d.ts     # FloorPlan → 3Dジオメトリ変換ロジック
```

## コンポーネント詳細

### `App.tsx`

- `viewMode: "2d" | "3d"` 状態を追加
- `ToolSheet` に3D切り替えボタンを追加
- `viewMode === "3d"` の場合、`FloorCanvas` の代わりに `Preview3D` を表示
- `Preview3D` は `React.lazy(() => import("./preview-3d"))` で遅延読み込み

### `preview-3d/index.tsx`

- `Suspense` + `fallback`（簡易ローダー）で `Preview3DCanvas` を包む
- props: `floor: FloorPlan`, `cellSize: number`, `darkMode: boolean`

### `preview-3d/scene.tsx`

- `<Canvas>` でR3Fレンダラを初期化
- 背景色：`darkMode ? "#1a1a1a" : "#f5f5f5"`
- 子要素：`PreviewCamera`, `Lighting`, `FloorMeshes`, `WallMeshes`

### `preview-3d/camera.tsx`

- `PerspectiveCamera`（fov=50）
- `OrbitControls` を以下の制約で設定：
  - `minPolarAngle = maxPolarAngle = Math.PI / 4`
  - `enablePan = false`
  - `minDistance = cellSize * 3`
  - `maxDistance = cellSize * max(width, height) * 2`
- 初期位置：全体が収まる自動計算

### `preview-3d/lighting.tsx`

- `<ambientLight intensity={0.6} />`
- `<directionalLight position={[10, 20, 10]} intensity={0.8} />`
- ダークモード時は intensity を調整

### `meshes/floor-mesh.tsx`

- props: `cx, cy, cellSize, floorType, darkMode`
- `PlaneGeometry(cellSize, cellSize)` + `rotation.x = -Math.PI / 2`
- `floorType` に対応した `MeshStandardMaterial`（色は2D表示と整合）

### `meshes/wall-mesh.tsx`

- props: `cx, cy, cellSize, edge: "top" | "left", wallType, darkMode`
- `PlaneGeometry(cellSize, wallHeight)` を垂直に配置
- `wallType` に応じた色・透過率
- `wallType === "none"` の場合はレンダリングしない

## データフロー・ジオメトリ変換

### `floor/geometry-3d.ts`

```typescript
export interface FloorTile {
  cx: number;
  cy: number;
  floorType: FloorType;
}

export interface WallSegment {
  cx: number;
  cy: number;
  edge: "top" | "left";
  wallType: WallType;
}

export function generateFloorTiles(floor: FloorPlan): FloorTile[];
export function generateWallSegments(floor: FloorPlan): WallSegment[];
```

### 座標変換

2D編集画面（左上原点）→ 3Dワールド（中心原点）:

```
worldX = (cx - width/2) * cellSize
worldZ = (cy - height/2) * cellSize
worldY = 0（床面）
```

### 壁セグメント配置

- **top壁**: `position=[worldX, wallHeight/2, worldZ - cellSize/2]`, `rotation.y=0`
- **left壁**: `position=[worldX - cellSize/2, wallHeight/2, worldZ]`, `rotation.y=Math.PI/2`

壁高さ: `cellSize * 2.5`（十分に高く見える値）

## マテリアル仕様

### 床色（2D表示との整合）

| floorType | ライトモード | ダークモード |
|---|---|---|
| wood | `#d4a373` | `#8b6f47` |
| water | `#a8d5e5` | `#5a8fa0` |
| tatami | `#c8d6af` | `#7a8f5c` |
| concrete | `#b0b0b0` | `#707070` |
| void | `#e0e0e0` | `#404040` |

### 壁色

| wallType | ライトモード | ダークモード |
|---|---|---|
| solid | `#333333` | `#cccccc` |
| solid_thin | `#666666` | `#999999` |
| window_full | 半透明青 `#87ceeb` @ opacity 0.5 | `#5a8fa0` @ opacity 0.5 |
| window_center | 上部50%を壁、下部50%を窓として2枚の板に分割して表示 |

## エラーハンドリング

1. **3Dライブラリ読み込み失敗**
   - `React.lazy` の `fallback` でローディング中表示
   - dynamic import 失敗時はエラーメッセージを表示し、2D画面に戻るボタンを提供

2. **WebGL非対応環境**
   - `Canvas` コンポーネントがエラーを投げる場合をキャッチ
   - 「お使いのブラウザは3D表示に対応していません」メッセージを表示

3. **大規模間取り**
   - 50×50セルを超える場合、インスタンスメッシュ（InstancedMesh）への移行を検討（将来対応）

## パフォーマンス考慮

- `React.memo` でメッシュコンポーネントをラップし、不要な再レンダリングを防止
- `useMemo` で `generateFloorTiles` / `generateWallSegments` の結果をキャッシュ
- 将来の拡張として `InstancedMesh` への移行を見据えた設計（型・データ構造を互換に保つ）

## テスト方針

- `floor/geometry-3d.ts` の変換ロジックに対して単体テストを追加
  - 空のFloorPlan → 空の配列
  - 1セルに壁・床があるFloorPlan → 正しい座標・向きのセグメント
  - 窓タイプの壁 → 正しいマテリアル属性
- 3DコンポーネントのテストはR3Fのレンダリングテスト（`@react-three/test-renderer`）で検討

## 依存関係

`packages/madories/package.json` に以下を追加：

```json
{
  "dependencies": {
    "@react-three/fiber": "^8.17.0",
    "@react-three/drei": "^9.114.0",
    "three": "^0.169.0"
  },
  "devDependencies": {
    "@types/three": "^0.169.0"
  }
}
```

## 将来拡張

- **家具3D表示**: `Item` 型に対応した簡易3Dモデル（Box, Cylinder など）を配置
- **複数階表示**: 階ごとにy軸オフセットを設定し、建物全体を3D表示
- **厚みのある壁**: 壁に厚みを持たせ、コーナー部の接続を自然にする
- **InstancedMesh**: 大規模間取りでの描画パフォーマンス最適化
