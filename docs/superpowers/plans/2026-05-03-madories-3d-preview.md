# madories 3Dプレビュー機能実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** madoriesにReact Three Fiberを使った3Dプレビュー機能を追加し、2D編集画面と切り替えて間取りを鳥瞰図で確認できるようにする

**Architecture:** FloorPlanデータを純粋関数で3Dジオメトリに変換し、R3FのCanvas内で床タイルと壁セグメントを表示する。2D/3D切り替えはApp.tsxでReact.lazyによるコード分割で行う。

**Tech Stack:** React, TypeScript, React Three Fiber, @react-three/drei, Three.js, bun

---

## ファイル構成

| ファイル | 種別 | 責務 |
|---|---|---|
| `packages/madories/src/floor/geometry-3d.ts` | 新規 | FloorPlan → FloorTile[] / WallSegment[] 変換 |
| `packages/madories/src/floor/geometry-3d.test.ts` | 新規 | 変換ロジックの単体テスト |
| `packages/madories/src/components/preview-3d/index.tsx` | 新規 | React.lazy用ラッパー + Suspense |
| `packages/madories/src/components/preview-3d/scene.tsx` | 新規 | R3F Canvas・背景色・子コンポーネント配置 |
| `packages/madories/src/components/preview-3d/camera.tsx` | 新規 | PerspectiveCamera + 制限付きOrbitControls |
| `packages/madories/src/components/preview-3d/lighting.tsx` | 新規 | ambientLight + directionalLight |
| `packages/madories/src/components/preview-3d/meshes/floor-mesh.tsx` | 新規 | 床タイルメッシュ（PlaneGeometry水平） |
| `packages/madories/src/components/preview-3d/meshes/wall-mesh.tsx` | 新規 | 壁セグメントメッシュ（PlaneGeometry垂直） |
| `packages/madories/src/components/App.tsx` | 修正 | viewMode状態、Preview3D遅延読み込み、条件付き表示 |
| `packages/madories/src/components/tool-sheet.tsx` | 修正 | 3D切り替えボタン追加 |
| `packages/madories/package.json` | 修正 | @react-three/fiber, @react-three/drei, three, @types/three 追加 |

---

## Task 1: 依存関係追加

**Files:**
- Modify: `packages/madories/package.json`

- [ ] **Step 1: package.json に3Dライブラリを追加**

```json
{
  "dependencies": {
    "@mijime/theme": "workspace:*",
    "@react-three/drei": "^9.114.0",
    "@react-three/fiber": "^8.17.0",
    "lucide-react": "^1.14.0",
    "three": "^0.169.0",
    "uuid": "^14.0.0"
  },
  "devDependencies": {
    "@types/node": "^25.6.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/three": "^0.169.0",
    "@types/uuid": "^11.0.0",
    "@typescript/native-preview": "^7.0.0-dev.20260429.1",
    "bun-types": "^1.3.13",
    "oxfmt": "^0.46.0",
    "oxlint": "^1.62.0",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: インストール実行**

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io && bun install`
Expected: 依存関係が正常に解決され、bun.lockが更新される

- [ ] **Step 3: Commit**

```bash
git add packages/madories/package.json bun.lock
git commit -m "deps: add @react-three/fiber, @react-three/drei, three"
```

---

## Task 2: 3Dジオメトリ変換ロジック（TDD）

**Files:**
- Create: `packages/madories/src/floor/geometry-3d.ts`
- Create: `packages/madories/src/floor/geometry-3d.test.ts`

- [ ] **Step 1: 変換ロジックのテストを書く**

```typescript
import { describe, expect, it } from "bun:test";
import { generateFloorTiles, generateWallSegments } from "./geometry-3d";
import type { FloorPlan } from "../types";

function makeFloor(width: number, height: number, overrides?: Partial<FloorPlan>): FloorPlan {
  return {
    cells: Array.from({ length: width * height }, () => ({
      floorType: null,
      item: null,
      wall: { left: "none", top: "none" },
    })),
    height,
    id: "test",
    name: "test",
    width,
    ...overrides,
  };
}

describe("generateFloorTiles", () => {
  it("空のフロアは空配列を返す", () => {
    const floor = makeFloor(2, 2);
    expect(generateFloorTiles(floor)).toEqual([]);
  });

  it("floorType が設定されたセルのみ返す", () => {
    const floor = makeFloor(2, 2, {
      cells: [
        { floorType: "wood", item: null, wall: { left: "none", top: "none" } },
        { floorType: null, item: null, wall: { left: "none", top: "none" } },
        { floorType: "water", item: null, wall: { left: "none", top: "none" } },
        { floorType: null, item: null, wall: { left: "none", top: "none" } },
      ],
    });
    expect(generateFloorTiles(floor)).toEqual([
      { cx: 0, cy: 0, floorType: "wood" },
      { cx: 0, cy: 1, floorType: "water" },
    ]);
  });
});

describe("generateWallSegments", () => {
  it("壁がない場合は空配列を返す", () => {
    const floor = makeFloor(2, 2);
    expect(generateWallSegments(floor)).toEqual([]);
  });

  it("top壁とleft壁を正しく抽出する", () => {
    const floor = makeFloor(2, 2, {
      cells: [
        { floorType: null, item: null, wall: { left: "solid", top: "none" } },
        { floorType: null, item: null, wall: { left: "none", top: "solid" } },
        { floorType: null, item: null, wall: { left: "none", top: "none" } },
        { floorType: null, item: null, wall: { left: "none", top: "none" } },
      ],
    });
    expect(generateWallSegments(floor)).toEqual([
      { cx: 0, cy: 0, edge: "left", wallType: "solid" },
      { cx: 1, cy: 0, edge: "top", wallType: "solid" },
    ]);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io/packages/madories && bun test src/floor/geometry-3d.test.ts`
Expected: FAIL - "generateFloorTiles is not defined" またはファイルが見つからないエラー

- [ ] **Step 3: 変換ロジックを実装**

```typescript
import type { FloorPlan, FloorType, WallType } from "../types";

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

export function generateFloorTiles(floor: FloorPlan): FloorTile[] {
  const tiles: FloorTile[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const cell = floor.cells[y * floor.width + x];
      if (cell.floorType !== null) {
        tiles.push({ cx: x, cy: y, floorType: cell.floorType });
      }
    }
  }
  return tiles;
}

export function generateWallSegments(floor: FloorPlan): WallSegment[] {
  const segments: WallSegment[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const cell = floor.cells[y * floor.width + x];
      if (cell.wall.top !== "none") {
        segments.push({ cx: x, cy: y, edge: "top", wallType: cell.wall.top });
      }
      if (cell.wall.left !== "none") {
        segments.push({ cx: x, cy: y, edge: "left", wallType: cell.wall.left });
      }
    }
  }
  return segments;
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io/packages/madories && bun test src/floor/geometry-3d.test.ts`
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/madories/src/floor/geometry-3d.ts packages/madories/src/floor/geometry-3d.test.ts
git commit -m "feat: add FloorPlan to 3D geometry conversion"
```

---

## Task 3: マテリアル色定数

**Files:**
- Create: `packages/madories/src/components/preview-3d/materials.ts`

- [ ] **Step 1: マテリアル色定数を作成**

```typescript
import type { FloorType, WallType } from "../../types";

export const FLOOR_COLORS: Record<
  FloorType,
  { light: string; dark: string }
> = {
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/madories/src/components/preview-3d/materials.ts
git commit -m "feat: add 3D preview material color constants"
```

---

## Task 4: 床メッシュコンポーネント

**Files:**
- Create: `packages/madories/src/components/preview-3d/meshes/floor-mesh.tsx`

- [ ] **Step 1: FloorMeshコンポーネントを実装**

```tsx
import { useMemo } from "react";
import type { FloorType } from "../../../types";
import { FLOOR_COLORS } from "../materials";

interface Props {
  cx: number;
  cy: number;
  cellSize: number;
  floorType: FloorType;
  darkMode: boolean;
}

export function FloorMesh({ cx, cy, cellSize, floorType, darkMode }: Props) {
  const worldX = (cx - 0) * cellSize; // width offset handled by parent group
  const worldZ = (cy - 0) * cellSize; // height offset handled by parent group
  const color = FLOOR_COLORS[floorType][darkMode ? "dark" : "light"];

  return (
    <mesh
      position={[worldX, 0, worldZ]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[cellSize, cellSize]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/madories/src/components/preview-3d/meshes/floor-mesh.tsx
git commit -m "feat: add FloorMesh component"
```

---

## Task 5: 壁メッシュコンポーネント

**Files:**
- Create: `packages/madories/src/components/preview-3d/meshes/wall-mesh.tsx`

- [ ] **Step 1: WallMeshコンポーネントを実装**

```tsx
import type { WallType } from "../../../types";
import { WALL_COLORS, WALL_HEIGHT_FACTOR } from "../materials";

interface Props {
  cx: number;
  cy: number;
  cellSize: number;
  edge: "top" | "left";
  wallType: WallType;
  darkMode: boolean;
}

export function WallMesh({ cx, cy, cellSize, edge, wallType, darkMode }: Props) {
  if (wallType === "none") return null;

  const wallHeight = cellSize * WALL_HEIGHT_FACTOR;
  const colorDef = WALL_COLORS[wallType];
  const color = colorDef[darkMode ? "dark" : "light"];
  const opacity = colorDef.opacity ?? 1;

  const worldX = (cx - 0) * cellSize;
  const worldZ = (cy - 0) * cellSize;

  if (wallType === "window_center") {
    // Split into upper wall and lower window
    const halfHeight = wallHeight / 2;
    const wallColor = WALL_COLORS.solid[darkMode ? "dark" : "light"];
    return (
      <group>
        {/* Upper wall */}
        <mesh
          position={[
            edge === "top" ? worldX : worldX - cellSize / 2,
            halfHeight + halfHeight / 2,
            edge === "top" ? worldZ - cellSize / 2 : worldZ,
          ]}
          rotation={[0, edge === "left" ? Math.PI / 2 : 0, 0]}
        >
          <planeGeometry args={[cellSize, halfHeight]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
        {/* Lower window */}
        <mesh
          position={[
            edge === "top" ? worldX : worldX - cellSize / 2,
            halfHeight / 2,
            edge === "top" ? worldZ - cellSize / 2 : worldZ,
          ]}
          rotation={[0, edge === "left" ? Math.PI / 2 : 0, 0]}
        >
          <planeGeometry args={[cellSize, halfHeight]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh
      position={[
        edge === "top" ? worldX : worldX - cellSize / 2,
        wallHeight / 2,
        edge === "top" ? worldZ - cellSize / 2 : worldZ,
      ]}
      rotation={[0, edge === "left" ? Math.PI / 2 : 0, 0]}
    >
      <planeGeometry args={[cellSize, wallHeight]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/madories/src/components/preview-3d/meshes/wall-mesh.tsx
git commit -m "feat: add WallMesh component"
```

---

## Task 6: ライティングコンポーネント

**Files:**
- Create: `packages/madories/src/components/preview-3d/lighting.tsx`

- [ ] **Step 1: Lightingコンポーネントを実装**

```tsx
interface Props {
  darkMode: boolean;
}

export function Lighting({ darkMode }: Props) {
  const ambientIntensity = darkMode ? 0.4 : 0.6;
  const dirIntensity = darkMode ? 0.6 : 0.8;

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[10, 20, 10]} intensity={dirIntensity} />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/madories/src/components/preview-3d/lighting.tsx
git commit -m "feat: add Lighting component for 3D preview"
```

---

## Task 7: カメラ・コントロールコンポーネント

**Files:**
- Create: `packages/madories/src/components/preview-3d/camera.tsx`

- [ ] **Step 1: PreviewCameraコンポーネントを実装**

```tsx
import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface Props {
  width: number;
  height: number;
  cellSize: number;
}

export function PreviewCamera({ width, height, cellSize }: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const maxDim = Math.max(width, height);
  const distance = maxDim * cellSize * 0.8;
  const maxDistance = maxDim * cellSize * 2;
  const minDistance = cellSize * 3;

  return (
    <>
      <perspectiveCamera makeDefault position={[0, distance, distance]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 4}
        minDistance={minDistance}
        maxDistance={maxDistance}
        target={[0, 0, 0]}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/madories/src/components/preview-3d/camera.tsx
git commit -m "feat: add PreviewCamera with constrained OrbitControls"
```

---

## Task 8: シーンコンポーネント

**Files:**
- Create: `packages/madories/src/components/preview-3d/scene.tsx`

- [ ] **Step 1: FloorPlanSceneコンポーネントを実装**

```tsx
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import type { FloorPlan } from "../../types";
import { generateFloorTiles, generateWallSegments } from "../../floor/geometry-3d";
import { PreviewCamera } from "./camera";
import { Lighting } from "./lighting";
import { FloorMesh } from "./meshes/floor-mesh";
import { WallMesh } from "./meshes/wall-mesh";

interface Props {
  floor: FloorPlan;
  cellSize: number;
  darkMode: boolean;
}

export function FloorPlanScene({ floor, cellSize, darkMode }: Props) {
  const tiles = useMemo(() => generateFloorTiles(floor), [floor]);
  const walls = useMemo(() => generateWallSegments(floor), [floor]);

  const offsetX = (floor.width * cellSize) / 2 - cellSize / 2;
  const offsetZ = (floor.height * cellSize) / 2 - cellSize / 2;

  const bg = darkMode ? "#1a1a1a" : "#f5f5f5";

  return (
    <Canvas style={{ background: bg, height: "100%", width: "100%" }}>
      <PreviewCamera width={floor.width} height={floor.height} cellSize={cellSize} />
      <Lighting darkMode={darkMode} />
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
      </group>
    </Canvas>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/madories/src/components/preview-3d/scene.tsx
git commit -m "feat: add FloorPlanScene component"
```

---

## Task 9: エントリーポイント（lazy importラッパー）

**Files:**
- Create: `packages/madories/src/components/preview-3d/index.tsx`

- [ ] **Step 1: Preview3Dエントリコンポーネントを実装**

```tsx
import { Suspense } from "react";
import type { FloorPlan } from "../../types";
import { FloorPlanScene } from "./scene";

interface Props {
  floor: FloorPlan;
  cellSize: number;
  darkMode: boolean;
}

function Loader() {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "13px" }}>
        Loading 3D...
      </span>
    </div>
  );
}

export default function Preview3D({ floor, cellSize, darkMode }: Props) {
  return (
    <Suspense fallback={<Loader />}>
      <FloorPlanScene floor={floor} cellSize={cellSize} darkMode={darkMode} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/madories/src/components/preview-3d/index.tsx
git commit -m "feat: add Preview3D lazy entry point with Suspense"
```

---

## Task 10: ツールシートに3D切り替えボタンを追加

**Files:**
- Modify: `packages/madories/src/components/tool-sheet.tsx`

- [ ] **Step 1: PropsにviewModeとonToggleViewModeを追加**

```typescript
import {
  Armchair,
  BrickWall,
  Download,
  Eraser,
  FolderOpen,
  Link,
  Maximize2,
  MousePointer2,
  PaintRoller,
  Pencil,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  View,
} from "lucide-react";

interface Props {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  onSave: () => void;
  onLoad: () => void;
  onExportAll: () => void;
  onShare: () => void;
  onClear: () => void;
  onRotateFloor: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFitView: () => void;
  darkMode: boolean;
  viewMode?: "2d" | "3d";
  onToggleViewMode?: () => void;
}
```

- [ ] **Step 2: ToolPanelContentの引数を展開し、ボタン群に3D切り替えを追加**

`ToolPanelContent` の引数リストに `viewMode` と `onToggleViewMode` を追加し、下部のボタン群（`div style={{ display: "flex", gap: "4px" }}`）に以下を追加：

```tsx
{
  disabled: false,
  icon: <View size={14} />,
  onClick: () => {
    onToggleViewMode?.();
    onClose?.();
  },
  title: viewMode === "3d" ? "2D" : "3D",
},
```

このエントリーを `RotateCw` の前または後ろに配置する。

- [ ] **Step 3: ToolSheet関数で新しいpropsをToolPanelContentに渡す**

```tsx
export function ToolSheet(props: Props) {
```

のままで、内部の `ToolPanelContent {...props}` で自動的に渡されるため変更不要。ただし `ToolPanelContent` の型定義に `viewMode` と `onToggleViewMode` が含まれていることを確認する。

- [ ] **Step 4: 型チェックとテスト**

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io/packages/madories && bun run check`
Expected: 型チェックが通る

- [ ] **Step 5: Commit**

```bash
git add packages/madories/src/components/tool-sheet.tsx
git commit -m "feat: add 3D preview toggle button to ToolSheet"
```

---

## Task 11: App.tsx に3D切り替え統合

**Files:**
- Modify: `packages/madories/src/components/App.tsx`

- [ ] **Step 1: React.lazyでPreview3Dを遅延読み込み**

```tsx
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";

const Preview3D = lazy(() => import("./preview-3d"));
```

- [ ] **Step 2: viewMode状態を追加し、ツールシートに渡す**

```tsx
export function App() {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  // ... existing state
```

- [ ] **Step 3: ToolSheet呼び出しにviewModeとonToggleViewModeを追加**

```tsx
<ToolSheet
  tool={tool}
  onToolChange={setTool}
  darkMode={dark}
  canUndo={canUndo}
  canRedo={canRedo}
  onUndo={undo}
  onRedo={redo}
  onFitView={() => canvasRef.current?.fitToContainer()}
  onSave={() => saveToFile(building, activeFloorId)}
  // ... other props
  viewMode={viewMode}
  onToggleViewMode={() => setViewMode((v) => (v === "2d" ? "3d" : "2d"))}
/>
```

- [ ] **Step 4: FloorCanvas表示部分をviewModeで条件分岐**

```tsx
<div className="flex-1 overflow-hidden relative flex flex-col" style={{ background: "var(--paper)" }}>
  <FloorStats floor={floor} />
  <div className="flex-1 overflow-hidden relative">
    {viewMode === "2d" ? (
      <FloorCanvas
        ref={canvasRef}
        floor={floor}
        ghostFloors={ghostFloors}
        cellSize={building.cellSize}
        darkMode={dark}
        tool={tool}
        // ... all existing handlers
      />
    ) : (
      <Preview3D
        floor={floor}
        cellSize={building.cellSize}
        darkMode={dark}
      />
    )}
  </div>
</div>
```

- [ ] **Step 5: 型チェックとテスト**

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io/packages/madories && bun run check`
Expected: 型チェックが通る

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io/packages/madories && bun test`
Expected: 既存テスト + geometry-3d.test.ts が全て通る

- [ ] **Step 6: Commit**

```bash
git add packages/madories/src/components/App.tsx
git commit -m "feat: integrate 3D preview toggle into App"
```

---

## Task 12: 最終検証

**Files:**
- 変更対象全体

- [ ] **Step 1: ビルド確認**

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io && bun run build`
Expected: エラーなくビルド完了

- [ ] **Step 2: 型チェックとリント**

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io/packages/madories && bun run check`
Expected: oxlint と tsgo が共に通る

- [ ] **Step 3: テスト実行**

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io/packages/madories && bun test`
Expected: 全テストがパス

- [ ] **Step 4: 動作確認（手動）**

Run: `cd /home/mijime/src/github.com/mijime/mijime.github.io && bun run dev`
手動確認項目:
1. 2D編集画面が正常に表示される
2. ToolSheetの「3D」ボタンをクリックすると3Dプレビューに切り替わる
3. 3Dプレビューでドラッグで水平回転、ホイールでズームができる
4. 「2D」ボタンで2D編集画面に戻れる
5. 床と壁が正しい色で表示される
6. ダークモード切り替えで3Dの背景色・マテリアルが追従する

- [ ] **Step 5: 最終コミット（必要に応じて）**

変更があればコミット。なければ既存コミットのままで完了。

---

## Self-Review

### Spec coverage check

| 設計書要件 | 実装タスク |
|---|---|
| 表示モード切り替え | Task 10, 11 |
| 壁：厚みなしの板 | Task 5 |
| 床：floorTypeに応じたタイル | Task 4 |
| 家具：非表示 | （床・壁のみ実装、家具コンポーネント未作成）✅ |
| 現在選択中の階のみ表示 | Task 8, 11（activeFloorIdのfloorを渡す）✅ |
| ドラッグで水平回転 | Task 7（minPolarAngle=maxPolarAngle）✅ |
| ホイール/ピンチでズーム | Task 7（OrbitControls標準対応）✅ |
| 見下ろし角度45°固定 | Task 7 ✅ |
| パン無効 | Task 7（enablePan=false）✅ |
| スマホ対応 | Task 7（タッチ・ピンチはOrbitControls標準対応）✅ |
| コード分割 | Task 11（React.lazy）✅ |
| ダークモード対応 | Task 4, 5, 6, 8 ✅ |

### Placeholder scan

- 「TBD」「TODO」「implement later」なし ✅
- 全ステップに実際のコードまたは正確なコマンドが含まれている ✅
- 型・関数名に矛盾なし ✅

### Type consistency

- `FloorTile`, `WallSegment` の型は Task 2 で定義し、Task 4, 5, 8 で一貫して使用 ✅
- `viewMode: "2d" | "3d"` は Task 10, 11 で一貫 ✅
- `Preview3D` の props は Task 9 と Task 11 で一致 ✅
