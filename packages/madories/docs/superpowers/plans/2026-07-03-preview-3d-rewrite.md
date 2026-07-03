# 3Dプレビュー作り直し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** madoriesの3Dプレビューを、純関数変換層(FloorPlan→SceneModel)+ 実寸ベース家具カタログ + ミニチュア建築模型風レンダリングに全面刷新する。

**Architecture:** `buildSceneModel(floor)` が2Dグリッドを正規化された `Box3D[]`(位置・寸法m、materialKey)に変換し、描画層は家具種別を知らずにBoxリストを描くだけ。家具は `catalog.ts` の実寸(cm)パーツ定義から生成。ライティングはshadow map + Lightformerベースの環境光 + ContactShadows。

**Tech Stack:** React 19 + TypeScript, three.js v0.169, @react-three/fiber v9, @react-three/drei v10, vitest。

**Spec:** `packages/madories/docs/superpowers/specs/2026-07-03-preview-3d-rewrite-design.md`

## Global Constraints

- 作業ディレクトリ: `packages/madories`(コマンドはすべてここで実行)
- 尺度: 1セル = 91cm、シーン単位 = m
- 壁: 高さ240cm・厚さ9cm(solid_thin は5cm)、窓: 下端90cm・上端200cm
- `Preview3D` の props `{ floor: FloorPlan; cellSize: number; darkMode: boolean }` は変更しない(`cellSize` は3D内部では未使用になるが互換のため残す)
- drei `Environment` のCDNプリセット(preset属性)は使用禁止(ネットワーク不要が要件)。Lightformer児要素方式のみ可
- コメントは非自明なWHYのみ。ドキュメント追加不要
- 各タスク末尾で `pnpm run check`(tsgo + oxlint)が通ること
- コミットは `feature/preview-3d-rewrite` ブランチ上で行う

**既存の重要シグネチャ(参照用):**

```ts
// src/types.ts
export type WallType = "none" | "solid" | "solid_thin" | "window_full" | "window_center";
export type FloorType =
  | "wood"
  | "water"
  | "tatami"
  | "concrete"
  | "void"
  | "exterior-concrete"
  | "exterior-grass";
export type ItemType =
  | "chair"
  | "desk"
  | "toilet"
  | "bathtub"
  | "kitchen"
  | "kitchen_small"
  | "washbasin"
  | "washbasin_half"
  | "washbasin_large"
  | "door"
  | "door_slide"
  | "stairs"
  | "fridge"
  | "washer"
  | "shelf1"
  | "shelf2"
  | "tv"
  | "sofa"
  | "bed_single"
  | "bed_double"
  | "desk_small"
  | "car";
export interface Item {
  type: ItemType;
  rotation: 0 | 90 | 180 | 270;
}
export interface Cell {
  wall: { top: WallType; left: WallType };
  floorType: FloorType | null;
  item: Item | null;
}
export interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: Cell[];
}

// src/items.ts
export interface ItemDef {
  type: ItemType;
  label: string;
  w: number;
  h: number;
  category: ItemCategory;
  storageScore?: number;
}
export const ITEM_DEF_MAP: Map<ItemType, ItemDef>; // 全ItemTypeのマス数(w,h)定義
```

---

### Task 1: config.ts — 尺度・壁仕様・マテリアル定義

**Files:**

- Create: `src/components/preview-3d/config.ts`

**Interfaces:**

- Produces: `CELL_CM`, `CM_TO_M`, `WALL_HEIGHT_CM`, `WALL_THICKNESS_CM`, `WALL_THIN_THICKNESS_CM`, `WINDOW_BOTTOM_CM`, `WINDOW_TOP_CM`, `FLOOR_THICKNESS_CM`, `type MaterialKey`, `MATERIALS: Record<MaterialKey, MaterialDef>`, `FLOOR_MATERIAL_KEYS: Record<FloorType, MaterialKey>`(Task 2〜4が使用)

- [ ] **Step 1: config.ts を作成**

```ts
import type { FloorType } from "../../types";

export const CELL_CM = 91;
export const CM_TO_M = 0.01;

export const WALL_HEIGHT_CM = 240;
// left壁はtop壁とのT字交差で天面が同一平面になりz-fightingするため0.5cm低くする
export const WALL_HEIGHT_LEFT_CM = 239.5;
export const WALL_THICKNESS_CM = 9;
export const WALL_THIN_THICKNESS_CM = 5;
export const WINDOW_BOTTOM_CM = 90;
export const WINDOW_TOP_CM = 200;
export const FLOOR_THICKNESS_CM = 5;

export type MaterialKey =
  | "floor_wood"
  | "floor_water"
  | "floor_tatami"
  | "floor_concrete"
  | "floor_void"
  | "floor_ext_concrete"
  | "floor_ext_grass"
  | "wall"
  | "wall_thin"
  | "glass"
  | "wood"
  | "wood_light"
  | "ceramic"
  | "metal"
  | "appliance"
  | "fabric"
  | "fabric_dark"
  | "mattress"
  | "screen"
  | "car_body"
  | "fallback";

export interface MaterialDef {
  light: string;
  dark: string;
  roughness: number;
  metalness: number;
  opacity?: number;
}

export const MATERIALS: Record<MaterialKey, MaterialDef> = {
  floor_wood: { light: "#d9b382", dark: "#8b6f47", metalness: 0, roughness: 0.7 },
  floor_water: { light: "#a8d5e5", dark: "#5a8fa0", metalness: 0.1, roughness: 0.2 },
  floor_tatami: { light: "#c8d6af", dark: "#7a8f5c", metalness: 0, roughness: 0.9 },
  floor_concrete: { light: "#b8b8b8", dark: "#707070", metalness: 0, roughness: 0.85 },
  floor_void: { light: "#e0e0e0", dark: "#404040", metalness: 0, roughness: 0.9 },
  floor_ext_concrete: { light: "#b0b0b0", dark: "#808080", metalness: 0, roughness: 0.9 },
  floor_ext_grass: { light: "#7cb87c", dark: "#5a8a5a", metalness: 0, roughness: 1 },
  wall: { light: "#f2efe9", dark: "#8f8b84", metalness: 0, roughness: 0.9 },
  wall_thin: { light: "#e5e1d8", dark: "#7d7972", metalness: 0, roughness: 0.9 },
  glass: { light: "#bfe3f0", dark: "#6fa9bd", metalness: 0.2, opacity: 0.35, roughness: 0.05 },
  wood: { light: "#a07048", dark: "#6b4a2e", metalness: 0, roughness: 0.6 },
  wood_light: { light: "#d4b896", dark: "#a08258", metalness: 0, roughness: 0.6 },
  ceramic: { light: "#f5f5f2", dark: "#c8c8c4", metalness: 0, roughness: 0.25 },
  metal: { light: "#c8c8cc", dark: "#8a8a90", metalness: 0.7, roughness: 0.35 },
  appliance: { light: "#e8e8ea", dark: "#b0b0b4", metalness: 0.3, roughness: 0.4 },
  fabric: { light: "#a0907d", dark: "#8c7d6a", metalness: 0, roughness: 1 },
  fabric_dark: { light: "#8b7d6b", dark: "#7a6e5e", metalness: 0, roughness: 1 },
  mattress: { light: "#eef0f2", dark: "#b8bcc2", metalness: 0, roughness: 0.9 },
  screen: { light: "#1a1a1a", dark: "#0a0a0a", metalness: 0.4, roughness: 0.3 },
  car_body: { light: "#c23a4e", dark: "#8f2a3a", metalness: 0.6, roughness: 0.3 },
  fallback: { light: "#999999", dark: "#666666", metalness: 0, roughness: 0.8 },
};

export const FLOOR_MATERIAL_KEYS: Record<FloorType, MaterialKey> = {
  wood: "floor_wood",
  water: "floor_water",
  tatami: "floor_tatami",
  concrete: "floor_concrete",
  void: "floor_void",
  "exterior-concrete": "floor_ext_concrete",
  "exterior-grass": "floor_ext_grass",
};
```

- [ ] **Step 2: 型チェック・lint**

Run: `pnpm run check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/components/preview-3d/config.ts
git commit -m "feat(madories): add 3D preview config with real-world dimensions and materials"
```

---

### Task 2: catalog.ts — 家具カタログ(実寸パーツ定義)

**Files:**

- Create: `src/components/preview-3d/catalog.ts`
- Test: `src/components/preview-3d/catalog.test.ts`

**Interfaces:**

- Consumes: `MaterialKey`, `WALL_HEIGHT_CM`(Task 1)
- Produces: `type Part = { size: [number, number, number]; offset: [number, number, number]; materialKey: MaterialKey }`(size=[w,h,d]cm、offset=[x, 底面高さ, z]cm・footprint中心基準)、`type ItemSpec = { footprint: { w: number; d: number }; parts: Part[] }`、`getItemSpec(type: ItemType): ItemSpec`(未定義タイプはフォールバック)

- [ ] **Step 1: 失敗するテストを書く**

`src/components/preview-3d/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ITEM_DEFS } from "../../items";
import { WALL_HEIGHT_CM } from "./config";
import { getItemSpec, ITEM_CATALOG } from "./catalog";

describe("catalog", () => {
  it("defines a spec for every ItemType", () => {
    for (const def of ITEM_DEFS) {
      expect(ITEM_CATALOG[def.type], def.type).toBeDefined();
    }
  });

  it("keeps all parts within the footprint horizontally", () => {
    for (const [type, spec] of Object.entries(ITEM_CATALOG)) {
      for (const part of spec.parts) {
        expect(Math.abs(part.offset[0]) + part.size[0] / 2, type).toBeLessThanOrEqual(
          spec.footprint.w / 2 + 1e-6,
        );
        expect(Math.abs(part.offset[2]) + part.size[2] / 2, type).toBeLessThanOrEqual(
          spec.footprint.d / 2 + 1e-6,
        );
      }
    }
  });

  it("keeps all parts below wall height", () => {
    for (const [type, spec] of Object.entries(ITEM_CATALOG)) {
      for (const part of spec.parts) {
        expect(part.offset[1] + part.size[1], type).toBeLessThanOrEqual(WALL_HEIGHT_CM);
      }
    }
  });

  it("falls back for unknown types", () => {
    const spec = getItemSpec("chair");
    expect(spec.parts.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm exec vitest run src/components/preview-3d/catalog.test.ts`
Expected: FAIL(`catalog.ts` が存在しない)

- [ ] **Step 3: catalog.ts を実装**

寸法はすべて実寸cm。`offset[1]` はパーツ**底面**の床からの高さ。

```ts
import type { ItemType } from "../../types";
import type { MaterialKey } from "./config";

export interface Part {
  size: [number, number, number]; // [w, h, d] cm
  offset: [number, number, number]; // [x, 底面高さ, z] cm、footprint中心基準
  materialKey: MaterialKey;
}

export interface ItemSpec {
  footprint: { w: number; d: number }; // cm、rotation=0時(w=x方向, d=z方向)
  parts: Part[];
}

function stairsParts(): Part[] {
  // 1x2セル(91x182cm)に7段、蹴上34.3cm・踏面26cmの直階段
  const stepCount = 7;
  const width = 85;
  const depthTotal = 182;
  const stepDepth = depthTotal / stepCount;
  const rise = 240 / stepCount;
  const parts: Part[] = [];
  for (let i = 0; i < stepCount; i++) {
    parts.push({
      materialKey: "wood",
      offset: [0, 0, -depthTotal / 2 + stepDepth * (i + 0.5)],
      size: [width, rise * (i + 1), stepDepth],
    });
  }
  return parts;
}

export const ITEM_CATALOG: Record<ItemType, ItemSpec> = {
  door: {
    footprint: { d: 91, w: 91 },
    parts: [{ materialKey: "wood", offset: [0, 0, 0], size: [80, 200, 6] }],
  },
  door_slide: {
    footprint: { d: 91, w: 91 },
    parts: [{ materialKey: "wood_light", offset: [0, 0, 0], size: [85, 200, 4] }],
  },
  stairs: { footprint: { d: 182, w: 91 }, parts: stairsParts() },
  toilet: {
    footprint: { d: 80, w: 45 },
    parts: [
      { materialKey: "ceramic", offset: [0, 20, 8], size: [38, 20, 55] },
      { materialKey: "ceramic", offset: [0, 40, -30], size: [42, 45, 18] },
    ],
  },
  bathtub: {
    footprint: { d: 160, w: 78 },
    parts: [{ materialKey: "ceramic", offset: [0, 0, 0], size: [75, 55, 160] }],
  },
  washbasin: {
    footprint: { d: 60, w: 65 },
    parts: [
      { materialKey: "ceramic", offset: [0, 0, 3], size: [60, 72, 54] },
      { materialKey: "glass", offset: [0, 110, -28], size: [55, 80, 3] },
    ],
  },
  washbasin_half: {
    footprint: { d: 45, w: 50 },
    parts: [{ materialKey: "ceramic", offset: [0, 0, 0], size: [45, 72, 40] }],
  },
  washbasin_large: {
    footprint: { d: 165, w: 65 },
    parts: [
      { materialKey: "wood_light", offset: [0, 0, 0], size: [60, 72, 160] },
      { materialKey: "ceramic", offset: [0, 72, 20], size: [55, 10, 55] },
      { materialKey: "glass", offset: [-28, 100, 0], size: [3, 90, 150] },
    ],
  },
  washer: {
    footprint: { d: 65, w: 65 },
    parts: [{ materialKey: "appliance", offset: [0, 0, 0], size: [60, 100, 60] }],
  },
  kitchen_small: {
    footprint: { d: 170, w: 70 },
    parts: [{ materialKey: "appliance", offset: [0, 0, 0], size: [65, 85, 165] }],
  },
  kitchen: {
    footprint: { d: 260, w: 70 },
    parts: [{ materialKey: "appliance", offset: [0, 0, 0], size: [65, 85, 255] }],
  },
  fridge: {
    footprint: { d: 72, w: 70 },
    parts: [{ materialKey: "metal", offset: [0, 0, 0], size: [68, 180, 70] }],
  },
  sofa: {
    footprint: { d: 165, w: 85 },
    parts: [
      { materialKey: "fabric", offset: [8, 0, 0], size: [60, 40, 160] },
      { materialKey: "fabric_dark", offset: [-30, 0, 0], size: [22, 75, 160] },
      { materialKey: "fabric_dark", offset: [8, 40, -72], size: [60, 20, 16] },
      { materialKey: "fabric_dark", offset: [8, 40, 72], size: [60, 20, 16] },
    ],
  },
  tv: {
    footprint: { d: 172, w: 45 },
    parts: [
      { materialKey: "wood", offset: [0, 0, 0], size: [42, 40, 170] },
      { materialKey: "screen", offset: [0, 45, 0], size: [8, 85, 150] },
    ],
  },
  shelf1: {
    footprint: { d: 88, w: 42 },
    parts: [{ materialKey: "wood", offset: [0, 0, 0], size: [40, 90, 85] }],
  },
  shelf2: {
    footprint: { d: 178, w: 42 },
    parts: [{ materialKey: "wood", offset: [0, 0, 0], size: [40, 180, 176] }],
  },
  bed_single: {
    footprint: { d: 196, w: 98 },
    parts: [
      { materialKey: "wood", offset: [0, 0, 0], size: [97, 25, 195] },
      { materialKey: "mattress", offset: [0, 25, 0], size: [90, 18, 188] },
      { materialKey: "ceramic", offset: [0, 43, -70], size: [50, 8, 35] },
    ],
  },
  bed_double: {
    footprint: { d: 196, w: 145 },
    parts: [
      { materialKey: "wood", offset: [0, 0, 0], size: [143, 25, 195] },
      { materialKey: "mattress", offset: [0, 25, 0], size: [136, 18, 188] },
      { materialKey: "ceramic", offset: [-32, 43, -70], size: [50, 8, 35] },
      { materialKey: "ceramic", offset: [32, 43, -70], size: [50, 8, 35] },
    ],
  },
  desk: {
    footprint: { d: 65, w: 125 },
    parts: [
      { materialKey: "wood_light", offset: [0, 68, 0], size: [120, 4, 60] },
      { materialKey: "wood", offset: [-55, 0, -25], size: [5, 68, 5] },
      { materialKey: "wood", offset: [55, 0, -25], size: [5, 68, 5] },
      { materialKey: "wood", offset: [-55, 0, 25], size: [5, 68, 5] },
      { materialKey: "wood", offset: [55, 0, 25], size: [5, 68, 5] },
    ],
  },
  desk_small: {
    footprint: { d: 50, w: 85 },
    parts: [{ materialKey: "wood_light", offset: [0, 0, 0], size: [80, 70, 45] }],
  },
  chair: {
    footprint: { d: 48, w: 48 },
    parts: [
      { materialKey: "wood", offset: [0, 0, 0], size: [8, 42, 8] },
      { materialKey: "fabric", offset: [0, 42, 0], size: [44, 8, 44] },
      { materialKey: "fabric_dark", offset: [0, 50, -20], size: [44, 45, 6] },
    ],
  },
  car: {
    footprint: { d: 430, w: 175 },
    parts: [
      { materialKey: "car_body", offset: [0, 20, 0], size: [170, 100, 425] },
      { materialKey: "glass", offset: [0, 120, 20], size: [160, 55, 190] },
    ],
  },
};

const FALLBACK_SPEC: ItemSpec = {
  footprint: { d: 80, w: 80 },
  parts: [{ materialKey: "fallback", offset: [0, 0, 0], size: [80, 60, 80] }],
};

export function getItemSpec(type: ItemType): ItemSpec {
  return ITEM_CATALOG[type] ?? FALLBACK_SPEC;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm exec vitest run src/components/preview-3d/catalog.test.ts`
Expected: PASS(4件)。footprint超過が出た場合はspec側のfootprintを広げる(セルクランプはTask 3で行うのでfootprintは実寸より僅かに大きくてよい)

- [ ] **Step 5: 型チェック・lint後コミット**

Run: `pnpm run check`

```bash
git add src/components/preview-3d/catalog.ts src/components/preview-3d/catalog.test.ts
git commit -m "feat(madories): add real-dimension furniture catalog for 3D preview"
```

---

### Task 3: scene-model.ts — FloorPlan→SceneModel 純関数変換

**Files:**

- Create: `src/components/preview-3d/scene-model.ts`
- Test: `src/components/preview-3d/scene-model.test.ts`

**Interfaces:**

- Consumes: Task 1のconfig定数、Task 2の `getItemSpec`、`ITEM_DEF_MAP`(src/items.ts)
- Produces:

```ts
export interface Box3D {
  position: [number, number, number]; // m、シーン原点=間取り中心、y=中心高さ
  size: [number, number, number]; // m
  materialKey: MaterialKey;
}
export interface SceneModel {
  floors: Box3D[];
  walls: Box3D[];
  items: Box3D[];
  bounds: { width: number; depth: number }; // m
}
export function buildSceneModel(floor: FloorPlan): SceneModel;
```

**仕様詳細:**

- 座標系: x=セルx方向、z=セルy方向、y=上。間取り全体の中心が原点。床上面が y=0
- 床: floorTypeがnullでないセルごとに厚さ5cmのBox(上面y=0、つまり中心y=-2.5cm)
- 壁: 同一行(top)・同一列(left)で連続する同種の壁はマージして1つのBoxにする。マージ後、両端に厚さ/2ずつ延長して角を閉じる。top壁は高さ240cm、left壁は239.5cm(`WALL_HEIGHT_LEFT_CM`、T字交差の天面z-fighting回避)
  - `solid`: 厚さ9cm、全高
  - `solid_thin`: 厚さ5cm、全高
  - `window_full`: 全高のglass 1枚
  - `window_center`: 下壁(0〜90cm)+ glass(90〜200cm)+ 上壁(200〜全高)の3分割
- 家具: 現行`dedup-items.ts`と同じ走査で複数セル家具を1回だけ処理。回転(0/90/180/270)はパーツのoffset/sizeをXZ平面で回転して適用(Box3Dはrotationを持たない)。footprintが占有セル領域(effectiveW/H × 91cm)を超える場合はXZ方向のみ等比縮小(高さは維持)
- ItemDefが無いtypeのセルはスキップ、catalogに無いtypeは`getItemSpec`のフォールバックで描画

- [ ] **Step 1: 失敗するテストを書く**

`src/components/preview-3d/scene-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Cell, FloorPlan } from "../../types";
import { CELL_CM, CM_TO_M } from "./config";
import { buildSceneModel } from "./scene-model";

function emptyCell(): Cell {
  return { floorType: null, item: null, wall: { left: "none", top: "none" } };
}

function makeFloor(width: number, height: number, mutate?: (cells: Cell[]) => void): FloorPlan {
  const cells = Array.from({ length: width * height }, emptyCell);
  mutate?.(cells);
  return { cells, height, id: "f1", name: "test", width };
}

const CELL_M = CELL_CM * CM_TO_M;

describe("buildSceneModel", () => {
  it("generates one floor box per non-null cell, top surface at y=0", () => {
    const floor = makeFloor(2, 1, (cells) => {
      cells[0].floorType = "wood";
    });
    const model = buildSceneModel(floor);
    expect(model.floors).toHaveLength(1);
    const box = model.floors[0];
    expect(box.materialKey).toBe("floor_wood");
    expect(box.size[0]).toBeCloseTo(CELL_M);
    // 2x1グリッドの左セル中心 = x: -CELL_M/2
    expect(box.position[0]).toBeCloseTo(-CELL_M / 2);
    expect(box.position[1] + box.size[1] / 2).toBeCloseTo(0);
  });

  it("computes bounds from grid size", () => {
    const model = buildSceneModel(makeFloor(3, 2));
    expect(model.bounds.width).toBeCloseTo(3 * CELL_M);
    expect(model.bounds.depth).toBeCloseTo(2 * CELL_M);
  });

  it("merges consecutive solid walls in a row into one box", () => {
    const floor = makeFloor(3, 1, (cells) => {
      cells[0].wall.top = "solid";
      cells[1].wall.top = "solid";
      cells[2].wall.top = "solid";
    });
    const model = buildSceneModel(floor);
    expect(model.walls).toHaveLength(1);
    // 3セル分 + 両端厚さ/2延長
    expect(model.walls[0].size[0]).toBeCloseTo(3 * CELL_M + 9 * CM_TO_M);
    expect(model.walls[0].materialKey).toBe("wall");
  });

  it("does not merge walls of different types", () => {
    const floor = makeFloor(2, 1, (cells) => {
      cells[0].wall.top = "solid";
      cells[1].wall.top = "solid_thin";
    });
    const model = buildSceneModel(floor);
    expect(model.walls).toHaveLength(2);
  });

  it("splits window_center into wall/glass/wall vertically", () => {
    const floor = makeFloor(1, 1, (cells) => {
      cells[0].wall.top = "window_center";
    });
    const model = buildSceneModel(floor);
    expect(model.walls).toHaveLength(3);
    const keys = model.walls.map((w) => w.materialKey).sort();
    expect(keys).toEqual(["glass", "wall", "wall"]);
    const glass = model.walls.find((w) => w.materialKey === "glass")!;
    // glass: 90cm〜200cm → 中心145cm、高さ110cm
    expect(glass.position[1]).toBeCloseTo(1.45);
    expect(glass.size[1]).toBeCloseTo(1.1);
  });

  it("renders a multi-cell item exactly once", () => {
    const floor = makeFloor(1, 2, (cells) => {
      // bed_single は w=1,h=2 の2セル占有。両セルに同じitemが入っている状態
      cells[0].item = { rotation: 0, type: "bed_single" };
      cells[1].item = { rotation: 0, type: "bed_single" };
    });
    const model = buildSceneModel(floor);
    // bed_singleのパーツ数 = 3(フレーム+マットレス+枕)
    expect(model.items).toHaveLength(3);
  });

  it("swaps footprint axes when rotated 90 degrees", () => {
    const floor = makeFloor(2, 2, (cells) => {
      cells[0].item = { rotation: 90, type: "bathtub" };
    });
    const model = buildSceneModel(floor);
    const tub = model.items[0];
    // bathtub本体 75x160(d) → 90度回転でx方向が160側になる
    expect(tub.size[0]).toBeGreaterThan(tub.size[2]);
  });

  it("clamps oversized footprints into the occupied cells keeping height", () => {
    const floor = makeFloor(1, 1, (cells) => {
      // washbasin_large は h=2 だが1x1グリッドに置く → 占有可能は1セルのみ、d=165cm > 91cm
      cells[0].item = { rotation: 0, type: "washbasin_large" };
    });
    const model = buildSceneModel(floor);
    for (const box of model.items) {
      expect(box.position[2] + box.size[2] / 2).toBeLessThanOrEqual(CELL_M / 2 + 1e-6);
      expect(box.position[2] - box.size[2] / 2).toBeGreaterThanOrEqual(-CELL_M / 2 - 1e-6);
    }
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm exec vitest run src/components/preview-3d/scene-model.test.ts`
Expected: FAIL(`scene-model.ts` が存在しない)

- [ ] **Step 3: scene-model.ts を実装**

```ts
import { ITEM_DEF_MAP } from "../../items";
import type { FloorPlan, Item, WallType } from "../../types";
import { getItemSpec, type Part } from "./catalog";
import {
  CELL_CM,
  CM_TO_M,
  FLOOR_MATERIAL_KEYS,
  FLOOR_THICKNESS_CM,
  type MaterialKey,
  WALL_HEIGHT_CM,
  WALL_HEIGHT_LEFT_CM,
  WALL_THICKNESS_CM,
  WALL_THIN_THICKNESS_CM,
  WINDOW_BOTTOM_CM,
  WINDOW_TOP_CM,
} from "./config";

export interface Box3D {
  position: [number, number, number];
  size: [number, number, number];
  materialKey: MaterialKey;
}

export interface SceneModel {
  floors: Box3D[];
  walls: Box3D[];
  items: Box3D[];
  bounds: { width: number; depth: number };
}

export function buildSceneModel(floor: FloorPlan): SceneModel {
  const halfW = (floor.width * CELL_CM) / 2;
  const halfD = (floor.height * CELL_CM) / 2;
  // cm座標(左上原点)→シーンm座標(中心原点)
  const toScene = (xCm: number, yCm: number, zCm: number): [number, number, number] => [
    (xCm - halfW) * CM_TO_M,
    yCm * CM_TO_M,
    (zCm - halfD) * CM_TO_M,
  ];
  const toSize = (w: number, h: number, d: number): [number, number, number] => [
    w * CM_TO_M,
    h * CM_TO_M,
    d * CM_TO_M,
  ];

  return {
    bounds: { depth: floor.height * CELL_CM * CM_TO_M, width: floor.width * CELL_CM * CM_TO_M },
    floors: buildFloors(floor, toScene, toSize),
    items: buildItems(floor, toScene, toSize),
    walls: buildWalls(floor, toScene, toSize),
  };
}

type ToScene = (x: number, y: number, z: number) => [number, number, number];
type ToSize = (w: number, h: number, d: number) => [number, number, number];

function buildFloors(floor: FloorPlan, toScene: ToScene, toSize: ToSize): Box3D[] {
  const boxes: Box3D[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const cell = floor.cells[y * floor.width + x];
      if (cell.floorType === null) continue;
      boxes.push({
        materialKey: FLOOR_MATERIAL_KEYS[cell.floorType],
        position: toScene((x + 0.5) * CELL_CM, -FLOOR_THICKNESS_CM / 2, (y + 0.5) * CELL_CM),
        size: toSize(CELL_CM, FLOOR_THICKNESS_CM, CELL_CM),
      });
    }
  }
  return boxes;
}

interface WallRun {
  wallType: Exclude<WallType, "none">;
  edge: "top" | "left";
  // top: 行z固定・x範囲、left: 列x固定・z範囲(セル単位)
  fixed: number;
  start: number;
  end: number; // exclusive
}

function collectWallRuns(floor: FloorPlan): WallRun[] {
  const runs: WallRun[] = [];
  // top壁: 行ごとにx方向へマージ
  for (let y = 0; y < floor.height; y++) {
    let current: WallRun | null = null;
    for (let x = 0; x < floor.width; x++) {
      const t = floor.cells[y * floor.width + x].wall.top;
      if (t !== "none" && current && current.wallType === t && current.end === x) {
        current.end = x + 1;
      } else if (t !== "none") {
        current = { edge: "top", end: x + 1, fixed: y, start: x, wallType: t };
        runs.push(current);
      } else {
        current = null;
      }
    }
  }
  // left壁: 列ごとにz方向へマージ
  for (let x = 0; x < floor.width; x++) {
    let current: WallRun | null = null;
    for (let y = 0; y < floor.height; y++) {
      const t = floor.cells[y * floor.width + x].wall.left;
      if (t !== "none" && current && current.wallType === t && current.end === y) {
        current.end = y + 1;
      } else if (t !== "none") {
        current = { edge: "left", end: y + 1, fixed: x, start: y, wallType: t };
        runs.push(current);
      } else {
        current = null;
      }
    }
  }
  return runs;
}

interface WallLayer {
  bottom: number;
  top: number;
  materialKey: MaterialKey;
}

function wallLayers(wallType: Exclude<WallType, "none">, height: number): WallLayer[] {
  switch (wallType) {
    case "solid":
      return [{ bottom: 0, materialKey: "wall", top: height }];
    case "solid_thin":
      return [{ bottom: 0, materialKey: "wall_thin", top: height }];
    case "window_full":
      return [{ bottom: 0, materialKey: "glass", top: height }];
    case "window_center":
      return [
        { bottom: 0, materialKey: "wall", top: WINDOW_BOTTOM_CM },
        { bottom: WINDOW_BOTTOM_CM, materialKey: "glass", top: WINDOW_TOP_CM },
        { bottom: WINDOW_TOP_CM, materialKey: "wall", top: height },
      ];
  }
}

function buildWalls(floor: FloorPlan, toScene: ToScene, toSize: ToSize): Box3D[] {
  const boxes: Box3D[] = [];
  for (const run of collectWallRuns(floor)) {
    const thickness = run.wallType === "solid_thin" ? WALL_THIN_THICKNESS_CM : WALL_THICKNESS_CM;
    const height = run.edge === "top" ? WALL_HEIGHT_CM : WALL_HEIGHT_LEFT_CM;
    const length = (run.end - run.start) * CELL_CM + thickness; // 両端t/2延長で角を閉じる
    const center = ((run.start + run.end) / 2) * CELL_CM;
    for (const layer of wallLayers(run.wallType, height)) {
      const h = layer.top - layer.bottom;
      const cy = layer.bottom + h / 2;
      if (run.edge === "top") {
        boxes.push({
          materialKey: layer.materialKey,
          position: toScene(center, cy, run.fixed * CELL_CM),
          size: toSize(length, h, thickness),
        });
      } else {
        boxes.push({
          materialKey: layer.materialKey,
          position: toScene(run.fixed * CELL_CM, cy, center),
          size: toSize(thickness, h, length),
        });
      }
    }
  }
  return boxes;
}

function getItemDrawOffset(
  w: number,
  h: number,
  rotation: Item["rotation"],
): { offX: number; offY: number; effectiveW: number; effectiveH: number } {
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveW = isRotated ? h : w;
  const effectiveH = isRotated ? w : h;
  const asymmetric = w !== h;
  const offX = asymmetric && rotation === 90 && effectiveW > 1 ? -(effectiveW - 1) : 0;
  const offY = asymmetric && rotation === 180 && effectiveH > 1 ? -(effectiveH - 1) : 0;
  return { effectiveH, effectiveW, offX, offY };
}

function rotatePart(part: Part, rotation: Item["rotation"]): Part {
  const [w, h, d] = part.size;
  const [ox, oy, oz] = part.offset;
  switch (rotation) {
    case 0:
      return part;
    case 90:
      return { materialKey: part.materialKey, offset: [oz, oy, -ox], size: [d, h, w] };
    case 180:
      return { materialKey: part.materialKey, offset: [-ox, oy, -oz], size: [w, h, d] };
    case 270:
      return { materialKey: part.materialKey, offset: [-oz, oy, ox], size: [d, h, w] };
  }
}

function buildItems(floor: FloorPlan, toScene: ToScene, toSize: ToSize): Box3D[] {
  const boxes: Box3D[] = [];
  const visited = new Set<number>();
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const idx = y * floor.width + x;
      if (visited.has(idx)) continue;
      const cell = floor.cells[idx];
      if (!cell.item) continue;
      const def = ITEM_DEF_MAP.get(cell.item.type);
      if (!def) continue;
      const { effectiveW, effectiveH, offX, offY } = getItemDrawOffset(
        def.w,
        def.h,
        cell.item.rotation,
      );
      for (let dy = 0; dy < effectiveH; dy++) {
        for (let dx = 0; dx < effectiveW; dx++) {
          const cx = x + dx;
          const cy = y + dy;
          if (cx < floor.width && cy < floor.height) visited.add(cy * floor.width + cx);
        }
      }
      const drawX = x + offX;
      const drawY = y + offY;
      // グリッド外へはみ出す占有分はクランプ対象から除外し、実際に見える範囲へ収める
      const availW = Math.min(effectiveW, floor.width - drawX) * CELL_CM;
      const availD = Math.min(effectiveH, floor.height - drawY) * CELL_CM;
      const centerX = (drawX + Math.min(effectiveW, floor.width - drawX) / 2) * CELL_CM;
      const centerZ = (drawY + Math.min(effectiveH, floor.height - drawY) / 2) * CELL_CM;
      const spec = getItemSpec(cell.item.type);
      const rot = cell.item.rotation;
      const isRotated = rot === 90 || rot === 270;
      const fpW = isRotated ? spec.footprint.d : spec.footprint.w;
      const fpD = isRotated ? spec.footprint.w : spec.footprint.d;
      const scale = Math.min(1, availW / fpW, availD / fpD);
      for (const rawPart of spec.parts) {
        const part = rotatePart(rawPart, rot);
        const [w, h, d] = part.size;
        boxes.push({
          materialKey: part.materialKey,
          position: toScene(
            centerX + part.offset[0] * scale,
            part.offset[1] + h / 2,
            centerZ + part.offset[2] * scale,
          ),
          size: toSize(w * scale, h, d * scale),
        });
      }
    }
  }
  return boxes;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm exec vitest run src/components/preview-3d/scene-model.test.ts`
Expected: PASS(8件)

- [ ] **Step 5: 型チェック・lint後コミット**

Run: `pnpm run check`

```bash
git add src/components/preview-3d/scene-model.ts src/components/preview-3d/scene-model.test.ts
git commit -m "feat(madories): add pure FloorPlan-to-SceneModel transform"
```

---

### Task 4: 描画層 — meshes / scene / index の書き換え

**Files:**

- Create: `src/components/preview-3d/meshes.tsx`
- Modify: `src/components/preview-3d/scene.tsx`(全置換)
- Modify: `src/components/preview-3d/index.tsx`(全置換)

**Interfaces:**

- Consumes: `buildSceneModel`, `SceneModel`, `Box3D`(Task 3)、`MATERIALS`, `MaterialKey`(Task 1)
- Produces: `Preview3D`(default export、props現行互換)。App.tsx側の変更なし

- [ ] **Step 1: meshes.tsx を作成**

MaterialKeyごとに `MeshStandardMaterial` をuseMemoで共有生成し、Box3Dリストを描く。

```tsx
import { useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { MATERIALS, type MaterialKey } from "./config";
import type { Box3D } from "./scene-model";

export function useSharedMaterials(darkMode: boolean): Map<MaterialKey, MeshStandardMaterial> {
  return useMemo(() => {
    const map = new Map<MaterialKey, MeshStandardMaterial>();
    for (const [key, def] of Object.entries(MATERIALS)) {
      map.set(
        key as MaterialKey,
        new MeshStandardMaterial({
          color: darkMode ? def.dark : def.light,
          metalness: def.metalness,
          opacity: def.opacity ?? 1,
          roughness: def.roughness,
          transparent: def.opacity !== undefined,
        }),
      );
    }
    return map;
  }, [darkMode]);
}

interface BoxListProps {
  boxes: Box3D[];
  materials: Map<MaterialKey, MeshStandardMaterial>;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export function BoxList({ boxes, materials, castShadow, receiveShadow }: BoxListProps) {
  return (
    <>
      {boxes.map((box, i) => (
        <mesh
          key={i}
          position={box.position}
          material={materials.get(box.materialKey)}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        >
          <boxGeometry args={box.size} />
        </mesh>
      ))}
    </>
  );
}
```

- [ ] **Step 2: scene.tsx を全置換**

```tsx
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import type { FloorPlan } from "../../types";
import { BoxList, useSharedMaterials } from "./meshes";
import { buildSceneModel } from "./scene-model";

interface Props {
  floor: FloorPlan;
  darkMode: boolean;
}

export function FloorPlanScene({ floor, darkMode }: Props) {
  const model = useMemo(() => buildSceneModel(floor), [floor]);
  const materials = useSharedMaterials(darkMode);

  const maxDim = Math.max(model.bounds.width, model.bounds.depth);
  const camDist = maxDim * 1.1;
  const bg = darkMode ? "#1a1a1a" : "#eceae6";

  return (
    <Canvas
      shadows
      style={{ background: bg, inset: 0, position: "absolute", touchAction: "none" }}
      gl={{ alpha: false, antialias: true }}
    >
      <PerspectiveCamera makeDefault fov={45} position={[0, camDist, camDist]} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.15}
        minDistance={maxDim * 0.3}
        maxDistance={maxDim * 2.5}
        enableDamping
        dampingFactor={0.1}
      />
      <ambientLight intensity={darkMode ? 0.3 : 0.45} />
      <directionalLight
        castShadow
        position={[maxDim * 0.6, maxDim * 1.2, maxDim * 0.4]}
        intensity={darkMode ? 1.2 : 1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-maxDim}
        shadow-camera-right={maxDim}
        shadow-camera-top={maxDim}
        shadow-camera-bottom={-maxDim}
        shadow-camera-far={maxDim * 4}
        shadow-bias={-0.0002}
      />
      {/* CDNプリセットは使わずLightformerで環境反射を作る(オフライン要件) */}
      <Environment resolution={64}>
        <Lightformer
          intensity={darkMode ? 0.5 : 1}
          position={[0, 5, 0]}
          scale={[10, 10, 1]}
          rotation-x={Math.PI / 2}
        />
        <Lightformer
          intensity={darkMode ? 0.2 : 0.5}
          position={[-5, 1, -1]}
          scale={[10, 2, 1]}
          rotation-y={Math.PI / 2}
        />
      </Environment>
      <ContactShadows
        position={[0, -0.051, 0]}
        opacity={darkMode ? 0.5 : 0.35}
        scale={maxDim * 1.6}
        blur={2}
        far={3}
        resolution={512}
      />
      <BoxList boxes={model.floors} materials={materials} receiveShadow />
      <BoxList boxes={model.walls} materials={materials} castShadow receiveShadow />
      <BoxList boxes={model.items} materials={materials} castShadow receiveShadow />
    </Canvas>
  );
}
```

- [ ] **Step 3: index.tsx を全置換(Error Boundary追加)**

```tsx
import { Component, type ReactNode } from "react";
import type { FloorPlan } from "../../types";
import { FloorPlanScene } from "./scene";

interface Props {
  floor: FloorPlan;
  cellSize: number; // 2D側との互換のため受け取るが3Dでは未使用
  darkMode: boolean;
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "grid", inset: 0, placeItems: "center", position: "absolute" }}>
          3Dプレビューの表示に失敗しました
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Preview3D({ floor, darkMode }: Props) {
  return (
    <SceneErrorBoundary>
      <FloorPlanScene floor={floor} darkMode={darkMode} />
    </SceneErrorBoundary>
  );
}
```

- [ ] **Step 4: 型チェック・lint**

Run: `pnpm run check`
Expected: 新ファイルのエラーなし。旧ファイル(meshes/、camera.tsx、lighting.tsx、materials.ts、dedup-items.ts)はまだ存在するが、scene.tsx から参照されなくなったのでコンパイルは通る。エラーが出る場合は旧ファイル由来かを確認し、旧ファイル由来ならTask 5で削除されるため無視せず先にTask 5のStep 1を実施してよい

- [ ] **Step 5: 目視確認**

Run: `pnpm run dev`(またはpackage.jsonのdevコマンド)でアプリを起動し、2D/3D切り替えで以下を確認:

- 床・壁・家具が表示され、影が床に落ちる
- 窓(window_center)の中央がガラスで透ける
- ライト/ダークモード切り替えで色が変わる
- 家具の回転が2D表示と一致する

- [ ] **Step 6: Commit**

```bash
git add src/components/preview-3d/meshes.tsx src/components/preview-3d/scene.tsx src/components/preview-3d/index.tsx
git commit -m "feat(madories): rewrite 3D preview rendering with shadows and shared materials"
```

---

### Task 5: 旧コード削除とクリーンアップ

**Files:**

- Delete: `src/components/preview-3d/camera.tsx`
- Delete: `src/components/preview-3d/lighting.tsx`
- Delete: `src/components/preview-3d/materials.ts`
- Delete: `src/components/preview-3d/materials.test.ts`
- Delete: `src/components/preview-3d/dedup-items.ts`
- Delete: `src/components/preview-3d/dedup-items.test.ts`
- Delete: `src/components/preview-3d/meshes/`(ディレクトリごと: floor-mesh.tsx, wall-mesh.tsx, furniture-mesh.tsx, furniture-mesh.test.ts, stairs-mesh.tsx)
- Delete: `src/floor/geometry-3d.ts`
- Delete: `src/floor/geometry-3d.test.ts`

**Interfaces:**

- Consumes: なし(削除のみ)
- Produces: なし

- [ ] **Step 1: 削除対象への参照が残っていないことを確認**

Run: `grep -rn "geometry-3d\|dedup-items\|preview-3d/materials\|preview-3d/camera\|preview-3d/lighting\|preview-3d/meshes" src/ --include="*.ts" --include="*.tsx" | grep -v "preview-3d/meshes.tsx"`
Expected: 削除対象ファイル自身の内部参照のみ(それ以外のヒットがあれば、そのファイルを新API(`buildSceneModel`等)に移行してから削除する)

- [ ] **Step 2: 削除**

```bash
git rm src/components/preview-3d/camera.tsx \
  src/components/preview-3d/lighting.tsx \
  src/components/preview-3d/materials.ts \
  src/components/preview-3d/materials.test.ts \
  src/components/preview-3d/dedup-items.ts \
  src/components/preview-3d/dedup-items.test.ts \
  src/floor/geometry-3d.ts \
  src/floor/geometry-3d.test.ts
git rm -r src/components/preview-3d/meshes
```

- [ ] **Step 3: 全テスト・チェック**

Run: `pnpm test`
Expected: 全件PASS(catalog.test / scene-model.test を含む)

Run: `pnpm run check`
Expected: エラーなし

- [ ] **Step 4: フォーマット**

Run: `pnpm run format`

- [ ] **Step 5: 目視最終確認**

`pnpm run dev` で2D/3D切り替えが動作すること(Task 4 Step 5と同じ観点)。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(madories): remove legacy 3D preview implementation"
```
