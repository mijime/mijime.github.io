# 3Dプレビュー作り直し 設計

日付: 2026-07-03

## 目的

madoriesの3Dプレビュー(`src/components/preview-3d/`)を全面的に作り直す。重視点:

1. **見た目のリアルさ**: 上質なミニチュア建築模型風(ソフトシャドウ + 環境光 + 接地感のあるAO)
2. **アーキテクチャ刷新**: マジックナンバー排除、家具の特殊ケース分岐排除、純関数の変換層

家具は簡易形状(直方体の組み合わせ)のままで良いが、**実世界寸法に基づいたサイズ感**にする。

## スコープ外

- 一人称視点、スクリーンショット、2D編集とのリアルタイム同期
- テクスチャ、GLTFモデル、postprocessing(SSAO等)
- App.tsx との接続インターフェース変更(`floor: FloorPlan, cellSize: number, darkMode: boolean` は維持)

## アーキテクチャ

既存の `src/components/preview-3d/` 一式と `src/floor/geometry-3d.ts` を置き換える:

```
src/components/preview-3d/
├── index.tsx        # エントリ(lazy load対象、propsは現行互換)
├── scene-model.ts   # FloorPlan → SceneModel 純関数変換(中核ロジック)
├── catalog.ts       # 家具カタログ: 実寸(cm) + パーツ構成のデータ定義
├── config.ts        # 尺度・壁仕様・マテリアル定義の集約
├── scene.tsx        # Canvas + ライティング + カメラ(薄い層)
└── meshes.tsx       # SceneModelを描画するだけの汎用メッシュ
```

### scene-model.ts

`buildSceneModel(floor: FloorPlan): SceneModel` の純関数。

```ts
type SceneModel = {
  floors: Box3D[];
  walls: Box3D[];
  items: Box3D[];
  bounds: { width: number; depth: number }; // カメラ距離算出用
};
type Box3D = {
  position: [number, number, number]; // シーン単位(m)
  size: [number, number, number];
  materialKey: MaterialKey;
};
```

- 現行 `geometry-3d.ts`(床タイル・壁セグメント生成)と `dedup-items.ts`(複数セル家具の重複排除)のロジックをここに統合
- 窓(`window_center`)は上部壁 + ガラス部の2つのBox3Dに分解
- 階段はカタログのパーツ定義(段のBox列)で表現し、専用コンポーネントは持たない
- すべてのメッシュはBox3Dのリストに正規化される → meshes.tsx に家具種別の分岐が不要になる

### catalog.ts

ItemTypeごとの実寸データ定義:

```ts
type ItemSpec = {
  footprint: { w: number; d: number }; // cm、rotation=0時
  parts: Part[];
};
type Part = {
  size: [number, number, number]; // cm
  offset: [number, number, number]; // footprint内相対、cm
  materialKey: MaterialKey;
};
```

- 例: ベッド 195×97×h40、机 天板h72 + 脚4本、ソファ 座面 + 背もたれ
- 現行の sofa/desk/washbasin/stairs 専用コンポーネントとITEM\_\*係数群を全廃し、このデータに一本化
- footprint がセル領域(rotation考慮後)より大きい場合はセル内に収まるよう縦横比を保ってスケールダウン

### config.ts

- 尺度: 1セル = 91cm(半帖グリッド)、シーン単位は m(1セル = 0.91)
- 壁: 高さ240cm、厚さ9cm。窓: 下端90cm、上端200cm
- マテリアル定義: `MaterialKey → { color(light/dark), roughness, metalness, opacity? }`
- カメラ・OrbitControls のパラメータもここに集約

## レンダリング(ミニチュア風)

- **影**: directional light の shadow map(PCFSoftShadowMap)。床が受影、壁・家具が投影
- **接地感**: drei `ContactShadows` を床下に配置
- **環境光**: drei `Environment` の内蔵プリセット(外部アセット・ネットワーク不要のものを使用)
- **マテリアル**: `meshStandardMaterial` を useMemo でMaterialKeyごとに共有生成。ライト/ダークモード対応は維持
- **z-fighting**: 現行の0.9/0.95スケール縮小ハックを廃止。実寸配置(壁厚9cm、家具はセル内寸法)で重なり自体を発生させない
- **カメラ**: 現行同様の俯瞰オービット。距離・角度制限は config から

## エラー処理

- カタログに未定義のItemTypeは既定Box(footprint=セルいっぱい、h=60cm)でフォールバック描画
- 3D表示全体を Error Boundary で包み、失敗時はメッセージ表示(現行はSuspenseのみ)

## テスト

- `scene-model.test.ts`: 床・壁・窓の生成、複数セル家具の重複排除、rotation別の配置(現行テスト資産を移植・拡張)
- `catalog.test.ts`: 全ItemTypeにspecが存在すること、パーツがfootprint内に収まること
- レンダリング(scene/meshes)はユニットテスト対象外(目視確認)
- 既存の `geometry-3d.test.ts` / `dedup-items.test.ts` / `furniture-mesh.test.ts` / `materials.test.ts` は置き換えに伴い削除

## 移行

一括置き換え(段階移行なし)。`src/floor/geometry-3d.ts` も削除。`pnpm test` と `pnpm run check` が通り、2D/3D切り替えが動作することを完了条件とする。
