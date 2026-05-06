# Unified Item Definition Design

**Date**: 2026-05-06
**Goal**: 2D/3Dアイテム定義を一箇所に集約し、回転計算を統一、if分岐を排除する

## 1. 統合 ItemDef (`items.ts`)

アイテムに関わるすべての情報を ItemDef に集約する:

```typescript
// DrawFn: 2Dアイコン描画関数。シグネチャは draw/icons/*.ts と同一
// (ctx: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, dark?: boolean) => void

interface MeshPart {
  geometry: [number, number, number]; // [w, h, d] — 実寸（ファクトリ関数の引数から計算）
  position: [number, number, number]; // [x, y, z] — 実座標（中心原点）
  color?: { light: string; dark: string }; // 未指定で ItemDef.color にフォールバック
}

interface ItemDef {
  type: ItemType;
  label: string;
  w: number;
  h: number;
  category: ItemCategory;
  storageScore?: number;
  // 新規追加
  color: { light: string; dark: string };
  heightFactor?: number;             // default: 0.8
  depthFactor?: number;              // default: 1
  parts?: (w: number, h: number, d: number) => MeshPart[]; // 未定義→単一box
  icon: (ctx: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, dark?: boolean) => void;
}
```

ITEM_DEFS 配列に全アイテムの定義を記述。ITEM_DEF_MAP はそのまま。

## 2. 回転計算の統一

`getItemDrawOffset` を廃止。`FurnitureMesh` は以下の一律計算式を使う:

```typescript
const displayedW = item.rotation % 180 === 0 ? def.w : def.h;
const displayedH = item.rotation % 180 === 0 ? def.h : def.w;

const posX = (x + displayedW / 2 - 0.5) * cellSize;  // grid center
const posZ = (y + displayedH / 2 - 0.5) * cellSize;
```

`dedupFloorItems` でも ITEM_DEF_MAP から w/h を引き、回転による displayedW/displayedH を直接計算する（`getItemDrawOffset` 不使用）。

## 3. 部品ベースのレンダリング

`FurnitureMesh` のレンダリングロジック:

```typescript
const parts = def.parts?.(width, height, depth);
if (parts) {
  return (
    <group position={[posX, 0, posZ]} rotation={rotation}>
      {parts.map((p, i) => (
        <mesh key={i} position={p.position}>
          <boxGeometry args={p.geometry} />
          <meshStandardMaterial color={p.color?.[darkMode ? "dark" : "light"] ?? color} />
        </mesh>
      ))}
    </group>
  );
}
// parts未定義: 単一box
return (
  <mesh position={[posX, height / 2, posZ]} rotation={rotation}>
    <boxGeometry args={[width, height, depth]} />
    <meshStandardMaterial color={color} />
  </mesh>
);
```

StairsMesh の特別扱いも `scene.tsx` から削除し、stairs の parts 定義で階段6段を表現する。

## 4. 削除されるもの

| ファイル | 削除対象 |
|----------|----------|
| `materials.ts` | `ITEM_COLORS`, `ITEM_HEIGHT_FACTORS`, `ITEM_DEPTH_FACTORS`, `ITEM_PART_COLORS`, `getItemHeightFactor`, `getItemDepthFactor`, `getItemPartColor` |
| `draw/icons/index.ts` | `ICON_REGISTRY` Map |
| `furniture-mesh.tsx` | `getItemDrawOffset`, `getItemColor`, 全 if 分岐 |
| `scene.tsx` | stairs の条件分岐 (`item.type === "stairs"`) |

残すもの:
- `materials.ts`: `FLOOR_COLORS`, `WALL_COLORS`, `WALL_HEIGHT_FACTOR`, `WALL_THICKNESS_FACTOR` — これらはアイテム定義と別
- `draw/icons/*.ts`: 個別アイコンファイルはそのまま（ItemDef.icon から参照）

## 5. 影響範囲

- `items.ts` が `draw/icons/*` を import する（icon ファイル群は items.ts に依存しないため循環なし）
- `furniture-mesh.tsx` が大幅に簡略化（~150行 → ~60行）
- `dedup-items.ts` の `getItemDrawOffset` 呼び出しを差し替え
- 全アイテムに `color`, `icon` を明示指定
- sofa, desk, washbasin_large, stairs に `parts` 定義を記述

## 6. 非目標

- 2Dアイコン描画の中身の変更はしない（定義場所の移動のみ）
- テストケースの改修は必要最小限（関数削除に伴うもののみ）
