# Unified Item Definition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all item-related definitions (2D icon, 3D color/dimensions/parts) into ItemDef in items.ts, remove per-type if-blocks and offset calculations.

**Architecture:** ItemDef becomes the single source of truth for each item type. FurnitureMesh iterates over `def.parts()` factory results instead of branching on `item.type`. Rotation offset is removed — items render from their natural anchor position.

**Tech Stack:** TypeScript, React, @react-three/fiber, bun, Partytown IVR scheduler.

---

## Task 1: Extend ItemDef with color, dimensions, parts, icon

**Files:**
- Modify: `packages/madories/src/items.ts`

- [ ] **Step 1: Write the failing test**

The test verifies that ItemDef now contains color, heightFactor, depthFactor, parts, and icon for a representative item.

Create `packages/madories/src/items.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { ITEM_DEF_MAP } from "./items";

describe("ItemDef (unified)", () => {
  it("provides color for all item types", () => {
    for (const [type, def] of ITEM_DEF_MAP) {
      expect(def.color).toBeDefined();
      expect(typeof def.color.light).toBe("string");
      expect(typeof def.color.dark).toBe("string");
    }
  });

  it("provides icon draw function for all item types", () => {
    for (const [type, def] of ITEM_DEF_MAP) {
      expect(typeof def.icon).toBe("function");
    }
  });

  it("provides heightFactor with correct default fallback", () => {
    expect(ITEM_DEF_MAP.get("chair")!.heightFactor).toBe(0.5);
    expect(ITEM_DEF_MAP.get("toilet")!.heightFactor).toBeUndefined(); // default 0.8
  });

  it("provides depthFactor with correct default fallback", () => {
    expect(ITEM_DEF_MAP.get("tv")!.depthFactor).toBe(0.15);
    expect(ITEM_DEF_MAP.get("sofa")!.depthFactor).toBeUndefined(); // default 1
  });

  it("provides parts factory for multi-part items", () => {
    const sofaDef = ITEM_DEF_MAP.get("sofa")!;
    expect(typeof sofaDef.parts).toBe("function");
    const parts = sofaDef.parts!(10, 0.9 * 10, 0.8 * 10, 2 * 10);
    expect(parts).toHaveLength(2);
    expect(parts[0].color).toBeDefined();
    expect(parts[0].geometry).toHaveLength(3);
    expect(parts[0].position).toHaveLength(3);
  });

  it("has no parts factory for simple items", () => {
    expect(ITEM_DEF_MAP.get("chair")!.parts).toBeUndefined();
  });
});
```

Run: `bun test packages/madories/src/items.test.ts`
Expected: FAIL — `color`, `icon` not yet on ItemDef.

- [ ] **Step 2: Extend ItemDef interface and ITEM_DEFS data**

Edit `packages/madories/src/items.ts`:

Add imports at top:

```typescript
import type { ItemType, WallType } from "./types";
import { drawBathtub } from "./draw/icons/bathtub";
import { drawBed } from "./draw/icons/bed";
import { drawChair } from "./draw/icons/chair";
import { drawDesk } from "./draw/icons/desk";
import { drawDoor } from "./draw/icons/door";
import { drawDoorSlide } from "./draw/icons/door_slide";
import { drawFridge } from "./draw/icons/fridge";
import { drawKitchen } from "./draw/icons/kitchen";
import { drawShelf } from "./draw/icons/shelf";
import { drawSofa } from "./draw/icons/sofa";
import { drawStairs } from "./draw/icons/stairs";
import { drawToilet } from "./draw/icons/toilet";
import { drawTv } from "./draw/icons/tv";
import { drawWashbasin } from "./draw/icons/washbasin";
import { drawWashbasinHalf } from "./draw/icons/washbasin-half";
import { drawWasher } from "./draw/icons/washer";
```

Add types after existing interface:

```typescript
export interface MeshPart {
  geometry: [number, number, number]; // [w, h, d]
  position: [number, number, number]; // [x, y, z]
  color?: { light: string; dark: string };
}

type DrawFn = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode?: boolean,
) => void;

export interface ItemDef {
  type: ItemType;
  label: string;
  w: number;
  h: number;
  category: ItemCategory;
  storageScore?: number;
  color: { light: string; dark: string };
  heightFactor?: number;
  depthFactor?: number;
  parts?: (cellSize: number, width: number, height: number, depth: number) => MeshPart[];
  icon: DrawFn;
}
```

Replace ITEM_DEFS with full definitions. All 21 entries need `color`, `icon`, and optional `heightFactor`/`depthFactor`/`parts`. Example for sofa:

```typescript
export const ITEM_DEFS: ItemDef[] = [
  // === 建具 ===
  { category: "建具", h: 1, label: "開き戸", type: "door", w: 1,
    color: { light: "#8b4513", dark: "#5c2e0c" }, icon: drawDoor },
  { category: "建具", h: 1, label: "引き戸", type: "door_slide", w: 1,
    color: { light: "#8b4513", dark: "#5c2e0c" }, icon: drawDoorSlide },
  { category: "建具", h: 2, label: "階段", type: "stairs", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" },
    parts: (cellSize: number) => {
      const def = { w: 1, h: 2 } as const;
      const stepCount = 6;
      const totalH = cellSize * 1.5;
      const stepW = cellSize * def.w;
      const stepD = (cellSize * def.h) / stepCount;
      const halfSpan = (cellSize * def.h) / 2;
      const stepH = totalH / stepCount;
      return Array.from({ length: stepCount }, (_, i) => ({
        geometry: [stepW * 0.95, stepH * 0.95, stepD * 0.95] as [number, number, number],
        position: [0, stepH * (i + 0.5), -halfSpan + stepD / 2 + i * stepD] as [number, number, number],
      }));
    },
    icon: drawStairs },

  // === 水回り ===
  { category: "水回り", h: 1, label: "トイレ", type: "toilet", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" }, icon: drawToilet },
  { category: "水回り", h: 2, label: "浴槽", type: "bathtub", w: 1,
    color: { light: "#e0e0e0", dark: "#bbbbbb" }, icon: drawBathtub },
  { category: "水回り", h: 1, label: "洗面台", type: "washbasin", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" }, icon: drawWashbasin },
  { category: "水回り", h: 1, label: "洗面台(小)", type: "washbasin_half", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" }, icon: drawWashbasinHalf },
  { category: "水回り", h: 2, label: "洗面台(大)", type: "washbasin_large", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" },
    parts: (_cs: number, w: number, h: number, d: number) => [
      { color: { light: "#E8F4F8", dark: "#1a3a4a" },
        geometry: [w * 0.28, h * 0.8, d], position: [-w * 0.36, h * 0.4, 0] },
      { color: { light: "#EAD8C0", dark: "#6a5a40" },
        geometry: [w * 0.65, h, d], position: [w * 0.175, h * 0.5, 0] },
    ],
    icon: drawWashbasin },
  { category: "水回り", h: 1, label: "洗濯機", type: "washer", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" }, heightFactor: 1.5, icon: drawWasher },

  // === キッチン ===
  { category: "キッチン", h: 2, label: "キッチン台(小)", type: "kitchen_small", w: 1,
    color: { light: "#d4a373", dark: "#8b6f47" }, icon: drawKitchen },
  { category: "キッチン", h: 3, label: "キッチン台", type: "kitchen", w: 1,
    color: { light: "#d4a373", dark: "#8b6f47" }, icon: drawKitchen },
  { category: "キッチン", h: 1, label: "冷蔵庫", type: "fridge", w: 1,
    color: { light: "#c0c0c0", dark: "#808080" }, heightFactor: 1.5, icon: drawFridge },

  // === リビング ===
  { category: "リビング", h: 2, label: "ソファ", type: "sofa", w: 1,
    color: { light: "#cd853f", dark: "#8b5a2b" },
    parts: (_cs: number, w: number, h: number, d: number) => [
      { color: { light: "#8B7D6B", dark: "#7a6e5e" },
        geometry: [w * 0.25, h * 0.8, d], position: [-w * 0.375, h * 0.6, 0] },
      { color: { light: "#A0907D", dark: "#8c7d6a" },
        geometry: [w * 0.45, h * 0.4, d], position: [w * 0.275, h * 0.2, 0] },
    ],
    icon: drawSofa },
  { category: "リビング", h: 2, label: "テレビ", type: "tv", w: 1,
    color: { light: "#1a1a1a", dark: "#0a0a0a" }, depthFactor: 0.15, icon: drawTv },
  { category: "リビング", h: 1, label: "棚", storageScore: 1, type: "shelf1", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" }, heightFactor: 1.5, icon: drawShelf },
  { category: "リビング", h: 2, label: "棚(2段)", storageScore: 2, type: "shelf2", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" }, heightFactor: 1.5, icon: drawShelf },
  { category: "リビング", h: 1, label: "椅子", type: "chair", w: 1,
    color: { light: "#8b5a2b", dark: "#5c3a1e" }, heightFactor: 0.5, icon: drawChair },
  { category: "リビング", h: 1, label: "机(小)", type: "desk_small", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" }, heightFactor: 0.5, icon: drawDesk },
  { category: "リビング", h: 2, label: "机(大)", type: "desk", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" }, heightFactor: 0.5,
    parts: (_cs: number, w: number, h: number, d: number) => {
      const legS = Math.min(w, d) * 0.07;
      const legH = h * 0.75;
      const topH = h * 0.15;
      const inset = Math.min(w, d) * 0.1;
      const legs: MeshPart[] = [
        [-w / 2 + inset, -d / 2 + inset],
        [w / 2 - inset, -d / 2 + inset],
        [-w / 2 + inset, d / 2 - inset],
        [w / 2 - inset, d / 2 - inset],
      ].map(([lx, lz]) => ({
        color: { light: "#6B5030", dark: "#7a5830" },
        geometry: [legS * 2, legH, legS * 2] as [number, number, number],
        position: [lx, legH / 2, lz] as [number, number, number],
      }));
      legs.push({
        color: { light: "#D4B896", dark: "#b08a60" },
        geometry: [w, topH, d] as [number, number, number],
        position: [0, legH + topH / 2, 0] as [number, number, number],
      });
      return legs;
    },
    icon: drawDesk },

  // === 寝室 ===
  { category: "寝室", h: 2, label: "ベッド(シングル)", type: "bed_single", w: 1,
    color: { light: "#4682b4", dark: "#2f5a7a" }, heightFactor: 0.5, icon: drawBed },
  { category: "寝室", h: 2, label: "ベッド(ダブル)", type: "bed_double", w: 2,
    color: { light: "#4682b4", dark: "#2f5a7a" }, heightFactor: 0.5, icon: drawBed },
];
```

Keep `ITEM_DEF_MAP` and all other exports (ITEM_GROUP_REPRESENTATIVE, ITEM_LEGEND_LABEL, WALL_LEGEND_LABEL, ITEM_CATEGORIES) unchanged.

- [ ] **Step 3: Run test to verify it passes**

Run: `bun test packages/madories/src/items.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/madories/src/items.ts packages/madories/src/items.test.ts
git commit -m "feat: extend ItemDef with color, heightFactor, depthFactor, parts, icon"
```

---

## Task 2: Refactor FurnitureMesh to use parts-based rendering

**Files:**
- Modify: `packages/madories/src/components/preview-3d/meshes/furniture-mesh.tsx`

- [ ] **Step 1: Update tests for removed functions**

Edit `packages/madories/src/components/preview-3d/meshes/furniture-mesh.test.ts` — replace old `getItemDrawOffset` tests with new tests for the parts-based rendering:

```typescript
import { describe, expect, it } from "bun:test";
import { getItemCenterPosition } from "./furniture-mesh";

describe("getItemCenterPosition", () => {
  const c = 10;

  it("centers a single-tile item on its cell", () => {
    const result = getItemCenterPosition(0, 0, 1, 1, c);
    expect(result).toEqual({ posX: 0, posZ: 0 });
  });

  it("centers a 1x2 item across its 2-cell span", () => {
    const result = getItemCenterPosition(0, 0, 1, 2, c);
    expect(result).toEqual({ posX: 0, posZ: 5 });
  });

  it("centers a 2x1 item across its 2-cell span", () => {
    const result = getItemCenterPosition(0, 0, 2, 1, c);
    expect(result).toEqual({ posX: 5, posZ: 0 });
  });

  it("works for non-zero origin cells", () => {
    const result = getItemCenterPosition(2, 3, 1, 1, c);
    expect(result).toEqual({ posX: 20, posZ: 30 });
  });

  it("handles 2x2 item centered", () => {
    const result = getItemCenterPosition(0, 0, 2, 2, c);
    expect(result).toEqual({ posX: 5, posZ: 5 });
  });
});
```

Run: `bun test packages/madories/src/components/preview-3d/meshes/furniture-mesh.test.ts`
Expected: FAIL — old imports broken after code changes (in next step).

- [ ] **Step 2: Rewrite FurnitureMesh**

Edit `packages/madories/src/components/preview-3d/meshes/furniture-mesh.tsx`:

```typescript
import { memo } from "react";
import type { Item, ItemType } from "../../../types";
import { ITEM_DEF_MAP } from "../../../items";

const ITEM_MESH_SCALE = 0.9;
const DEFAULT_HEIGHT_FACTOR = 0.8;
const DEFAULT_DEPTH_FACTOR = 1;

interface Props {
  x: number;
  y: number;
  cellSize: number;
  item: Item;
  darkMode: boolean;
}

export function getItemCenterPosition(
  drawX: number,
  drawY: number,
  effectiveW: number,
  effectiveH: number,
  cellSize: number,
): { posX: number; posZ: number } {
  const posX = (drawX + effectiveW / 2 - 0.5) * cellSize;
  const posZ = (drawY + effectiveH / 2 - 0.5) * cellSize;
  return { posX, posZ };
}

export const FurnitureMesh = memo(function FurnitureMesh({
  x,
  y,
  cellSize,
  item,
  darkMode,
}: Props) {
  const def = ITEM_DEF_MAP.get(item.type);
  if (!def) return null;

  const displayedW = item.rotation % 180 === 0 ? def.w : def.h;
  const displayedH = item.rotation % 180 === 0 ? def.h : def.w;

  const { posX, posZ } = getItemCenterPosition(x, y, displayedW, displayedH, cellSize);

  const width = def.w * cellSize * ITEM_MESH_SCALE;
  const depth = def.h * cellSize * ITEM_MESH_SCALE * (def.depthFactor ?? DEFAULT_DEPTH_FACTOR);
  const height = cellSize * (def.heightFactor ?? DEFAULT_HEIGHT_FACTOR);

  const color = darkMode ? def.color.dark : def.color.light;

  const rotation: [number, number, number] = [0, -item.rotation * (Math.PI / 180), 0];

  const parts = def.parts?.(cellSize, width, height, depth);
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

  return (
    <mesh position={[posX, height / 2, posZ]} rotation={rotation}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
});
```

Key changes:
- Remove `ITEM_COLORS`, `getItemDepthFactor`, `getItemHeightFactor`, `getItemPartColor` imports
- Remove `getItemDrawOffset`, `getItemColor` functions
- Remove all `if (item.type === "sofa")` etc. blocks
- Compute `displayedW`/`displayedH` directly from def.w/def.h and rotation
- Read color, heightFactor, depthFactor, parts from `def` (ItemDef)
- Use `def.parts?.(cellSize, width, height, depth)` for multi-part rendering

- [ ] **Step 3: Run type check and tests**

```bash
cd packages/madories && bun run check
```
Expected: 0 errors, 0 warnings (after Task 3 too, for now may have errors from dedup-items and stairs-mesh)

```bash
bun test packages/madories/src/components/preview-3d/meshes/furniture-mesh.test.ts
```
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/madories/src/components/preview-3d/meshes/furniture-mesh.tsx packages/madories/src/components/preview-3d/meshes/furniture-mesh.test.ts
git commit -m "refactor: use parts-based rendering in FurnitureMesh, remove per-type if-blocks"
```

---

## Task 3: Update dedup-items to use direct dimension computation

**Files:**
- Modify: `packages/madories/src/components/preview-3d/dedup-items.ts`

- [ ] **Step 1: Rewrite dedupFloorItems to not use getItemDrawOffset**

Edit `packages/madories/src/components/preview-3d/dedup-items.ts`:

```typescript
import type { FloorPlan } from "../../types";
import { ITEM_DEF_MAP } from "../../items";

export function dedupFloorItems(
  floor: FloorPlan,
): { x: number; y: number; item: FloorPlan["cells"][number]["item"] }[] {
  const result: { x: number; y: number; item: FloorPlan["cells"][number]["item"] }[] = [];
  const visited = new Set<number>();
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const idx = y * floor.width + x;
      if (visited.has(idx)) continue;
      const cell = floor.cells[idx];
      if (!cell.item) continue;
      const def = ITEM_DEF_MAP.get(cell.item.type);
      if (!def) continue;
      result.push({ x, y, item: cell.item });
      const rotated = cell.item.rotation % 180 === 0;
      const effectiveW = rotated ? def.w : def.h;
      const effectiveH = rotated ? def.h : def.w;
      for (let dy = 0; dy < effectiveH; dy++) {
        for (let dx = 0; dx < effectiveW; dx++) {
          const cx = x + dx;
          const cy = y + dy;
          if (cx < floor.width && cy < floor.height) {
            visited.add(cy * floor.width + cx);
          }
        }
      }
    }
  }
  return result;
}
```

Only change: replace `getItemDrawOffset(def.w, def.h, cell.item.rotation)` with direct `rotated ? def.w : def.h` computation. The effectiveW/effectiveH logic is identical — only `offX`/`offY` are dropped since they are no longer used.

- [ ] **Step 2: Run existing dedup tests**

```bash
bun test packages/madories/src/components/preview-3d/dedup-items.test.ts
```
Expected: All tests PASS (same effectiveW/effectiveH logic, same anchor positions)

- [ ] **Step 3: Commit**

```bash
git add packages/madories/src/components/preview-3d/dedup-items.ts
git commit -m "refactor: compute displayed dimensions directly in dedupFloorItems"
```

---

## Task 4: Remove StairsMesh, integrate stairs into parts

**Files:**
- Delete: `packages/madories/src/components/preview-3d/meshes/stairs-mesh.tsx`
- Modify: `packages/madories/src/components/preview-3d/scene.tsx`

- [ ] **Step 1: Delete StairsMesh and remove stairs special case from scene.tsx**

Delete file: `packages/madories/src/components/preview-3d/meshes/stairs-mesh.tsx`

Edit `packages/madories/src/components/preview-3d/scene.tsx` — remove `StairsMesh` import and conditional dispatch:

```typescript
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { FloorPlan } from "../../types";
import { generateFloorTiles, generateWallSegments } from "../../floor/geometry-3d";
import { PreviewCamera } from "./camera";
import { Lighting } from "./lighting";
import { FloorMesh } from "./meshes/floor-mesh";
import { WallMesh } from "./meshes/wall-mesh";
import { FurnitureMesh } from "./meshes/furniture-mesh";
import { dedupFloorItems } from "./dedup-items";

interface Props {
  floor: FloorPlan;
  cellSize: number;
  darkMode: boolean;
}

export function FloorPlanScene({ floor, cellSize, darkMode }: Props) {
  const tiles = useMemo(() => generateFloorTiles(floor), [floor]);
  const walls = useMemo(() => generateWallSegments(floor), [floor]);
  const items = useMemo(() => dedupFloorItems(floor), [floor]);

  const offsetX = (floor.width * cellSize) / 2 - cellSize / 2;
  const offsetZ = (floor.height * cellSize) / 2 - cellSize / 2;

  const bg = darkMode ? "#1a1a1a" : "#f5f5f5";

  const maxDim = Math.max(floor.width, floor.height);

  return (
    <>
      <Canvas
        style={{ background: bg, position: "absolute", inset: 0, touchAction: "none" }}
        gl={{ antialias: true, alpha: false }}
      >
        <PreviewCamera width={floor.width} height={floor.height} cellSize={cellSize} />
        <Lighting darkMode={darkMode} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.1}
          minDistance={cellSize * 3}
          maxDistance={cellSize * maxDim * 2}
          enableDamping
          dampingFactor={0.1}
        />
        <group position={[-offsetX, 0, -offsetZ]}>
          {tiles.map((tile) => (
            <FloorMesh
              key={`floor-${tile.cx}-${tile.cy}`}
              cx={tile.cx}
              cy={tile.cy}
              cellSize={cellSize}
              floorType={tile.floorType}
              darkMode={darkMode}
            />
          ))}
          {walls.map((wall, i) => (
            <WallMesh
              key={`wall-${wall.cx}-${wall.cy}-${wall.edge}-${i}`}
              cx={wall.cx}
              cy={wall.cy}
              cellSize={cellSize}
              edge={wall.edge}
              wallType={wall.wallType}
              darkMode={darkMode}
            />
          ))}
          {items.map((it, i) => {
            if (!it.item) return null;
            return (
              <FurnitureMesh
                key={`item-${it.x}-${it.y}-${i}`}
                x={it.x}
                y={it.y}
                cellSize={cellSize}
                item={it.item}
                darkMode={darkMode}
              />
            );
          })}
        </group>
      </Canvas>
    </>
  );
}
```

Changes: Remove lines 1 (StairsMesh import) and lines 72-83 (conditional stairs dispatch). Now all items go through FurnitureMesh.

- [ ] **Step 2: Run full test suite**

```bash
cd packages/madories && bun test
```
Expected: All tests pass.

- [ ] **Step 3: Run type check**

```bash
cd packages/madories && bun run check
```
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add packages/madories/src/components/preview-3d/meshes/stairs-mesh.tsx packages/madories/src/components/preview-3d/scene.tsx
git commit -m "refactor: remove StairsMesh, stairs now uses parts-based rendering"
```

---

## Task 5: Update draw/icons to use ItemDef.icon

**Files:**
- Modify: `packages/madories/src/draw/icons/index.ts`
- Modify: `packages/madories/src/draw/icons/cache.ts`
- Modify: `packages/madories/src/draw/draw-items.ts`

- [ ] **Step 1: Remove ICON_REGISTRY from index.ts, update cache.ts**

Edit `packages/madories/src/draw/icons/index.ts` — remove ICON_REGISTRY, keep DrawFn type:

```typescript
export type DrawFn = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode?: boolean,
) => void;
```

Edit `packages/madories/src/draw/icons/cache.ts` — replace ICON_REGISTRY usage with ItemDef.icon:

```typescript
import { ITEM_DEF_MAP } from "../../items";
import type { ItemType } from "../../types";

const cache = new Map<string, OffscreenCanvas>();

export function getCachedIcon(
  type: ItemType,
  rotation: 0 | 90 | 180 | 270,
  cellSize: number,
  darkMode = false,
): OffscreenCanvas | null {
  const def = ITEM_DEF_MAP.get(type);
  if (!def) {
    return null;
  }

  const key = `${type}:${rotation}:${cellSize}:${darkMode ? "d" : "l"}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }

  const isRotated = rotation === 90 || rotation === 270;
  const naturalW = def.w * cellSize;
  const naturalH = def.h * cellSize;
  const boundW = (isRotated ? def.h : def.w) * cellSize;
  const boundH = (isRotated ? def.w : def.h) * cellSize;

  const oc = new OffscreenCanvas(boundW, boundH);
  const ctx = oc.getContext("2d")!;
  ctx.translate(boundW / 2, boundH / 2);
  ctx.rotate((rotation * Math.PI) / 180);

  const pad = 2;
  def.icon(
    ctx,
    -naturalW / 2 + pad,
    -naturalH / 2 + pad,
    naturalW - 2 * pad,
    naturalH - 2 * pad,
    darkMode,
  );

  cache.set(key, oc);
  return oc;
}

export function clearIconCache(): void {
  cache.clear();
}
```

Changes: Replace `ICON_REGISTRY.get(type)` conditional with direct `def.icon()` call. Remove `import { ICON_REGISTRY } from "./index"`.

- [ ] **Step 2: Simplify getItemDrawOffset in draw-items.ts**

Edit `packages/madories/src/draw/draw-items.ts` — remove the local `getItemDrawOffset` function, replace with direct computation matching 3D approach:

```typescript
import { ITEM_DEF_MAP } from "../items";
import type { FloorPlan, Item } from "../types";
import { getCachedIcon } from "./icons/cache";

export function drawItemAt(
  ctx: CanvasRenderingContext2D,
  item: Item,
  px: number,
  py: number,
  cellSize: number,
  alpha = 1,
): void {
  const oc = getCachedIcon(item.type, item.rotation, cellSize);
  if (!oc) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(oc, px, py);
  ctx.restore();
}

export function getDisplayedDimensions(
  def: { w: number; h: number },
  rotation: 0 | 90 | 180 | 270,
): { effectiveW: number; effectiveH: number } {
  const rotated = rotation % 180 !== 0;
  return {
    effectiveW: rotated ? def.h : def.w,
    effectiveH: rotated ? def.w : def.h,
  };
}

export function drawItems(ctx: CanvasRenderingContext2D, floor: FloorPlan, cellSize: number): void {
  const { width, height, cells } = floor;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cells[y * width + x];
      if (!cell.item) {
        continue;
      }

      const itemDef = ITEM_DEF_MAP.get(cell.item.type);
      if (!itemDef) {
        continue;
      }

      const { effectiveW, effectiveH } = getDisplayedDimensions(itemDef, cell.item.rotation);

      if (x < 0 || y < 0 || x + effectiveW > width || y + effectiveH > height) {
        continue;
      }

      drawItemAt(ctx, cell.item, x * cellSize, y * cellSize, cellSize);
    }
  }
}
```

Changes:
- Replace `getItemDrawOffset` with `getDisplayedDimensions` (returns only w/h, no offsets)
- Remove drawX/drawY offset — use raw x,y grid position
- Remove `offX`/`offY` from bounds check

- [ ] **Step 3: Run full test suite + type check**

```bash
cd packages/madories && bun test && bun run check
```
Expected: All tests pass, 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add packages/madories/src/draw/icons/index.ts packages/madories/src/draw/icons/cache.ts packages/madories/src/draw/draw-items.ts
git commit -m "refactor: remove ICON_REGISTRY, use ItemDef.icon; remove per-item draw offset"
```

---

## Task 6: Clean up materials.ts

**Files:**
- Modify: `packages/madories/src/components/preview-3d/materials.ts`
- Modify/Delete: `packages/madories/src/components/preview-3d/materials.test.ts`

- [ ] **Step 1: Remove item-specific exports from materials.ts**

Edit `packages/madories/src/components/preview-3d/materials.ts` — remove all item-related definitions. Keep only FLOOR_COLORS, WALL_COLORS, WALL_HEIGHT_FACTOR, WALL_THICKNESS_FACTOR:

```typescript
import type { FloorType, WallType } from "../../types";

export const FLOOR_COLORS: Record<FloorType, { light: string; dark: string }> = {
  wood: { light: "#d4a373", dark: "#8b6f47" },
  water: { light: "#a8d5e5", dark: "#5a8fa0" },
  tatami: { light: "#c8d6af", dark: "#7a8f5c" },
  concrete: { light: "#b0b0b0", dark: "#707070" },
  void: { light: "#e0e0e0", dark: "#404040" },
};

export const WALL_COLORS: Record<
  Exclude<WallType, "none">,
  { light: string; dark: string; opacity?: number }
> = {
  solid: { light: "#333333", dark: "#cccccc" },
  solid_thin: { light: "#666666", dark: "#999999" },
  window_full: { light: "#87ceeb", dark: "#5a8fa0", opacity: 0.5 },
  window_center: { light: "#87ceeb", dark: "#5a8fa0", opacity: 0.5 },
};

export const WALL_HEIGHT_FACTOR = 2.5;

export const WALL_THICKNESS_FACTOR = 0.1;
```

Removed: ITEM_COLORS, ITEM_HEIGHT_FACTORS, ITEM_DEPTH_FACTORS, ITEM_PART_COLORS, ITEM_HEIGHT_FACTOR_DEFAULT, getItemHeightFactor, getItemDepthFactor, getItemPartColor.

- [ ] **Step 2: Update materials test**

Edit `packages/madories/src/components/preview-3d/materials.test.ts` — remove tests for removed functions. Keep only a basic sanity check:

```typescript
import { describe, expect, it } from "bun:test";
import { FLOOR_COLORS, WALL_COLORS } from "./materials";

describe("FLOOR_COLORS", () => {
  it("has light and dark for all floor types", () => {
    for (const entry of Object.values(FLOOR_COLORS)) {
      expect(typeof entry.light).toBe("string");
      expect(typeof entry.dark).toBe("string");
    }
  });
});

describe("WALL_COLORS", () => {
  it("has light and dark for all wall types", () => {
    for (const entry of Object.values(WALL_COLORS)) {
      expect(typeof entry.light).toBe("string");
      expect(typeof entry.dark).toBe("string");
    }
  });
});
```

- [ ] **Step 3: Run full test suite + type check**

```bash
cd packages/madories && bun test && bun run check
```
Expected: All tests pass, 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add packages/madories/src/components/preview-3d/materials.ts packages/madories/src/components/preview-3d/materials.test.ts
git commit -m "refactor: remove item-specific exports from materials.ts"
```

---

## Verification

After all tasks, run:

```bash
cd packages/madories && bun test && bun run check
```

Expected: 100+ tests pass, 0 type errors, 0 lint warnings.

Also verify the 2D/3D rendering works visually by running the app and checking that:
- TV shows body + screen parts in 3D
- Sofa shows back + seat parts
- Desk shows legs + tabletop
- Washbasin_large shows mirror + counter
- Stairs shows 6 steps
- All items rotate correctly at 0/90/180/270 degrees
- Both 2D and 3D views render correctly
