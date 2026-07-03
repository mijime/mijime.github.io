# madories 壁エッジ再構築 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 壁をセルの top/left フラグからエッジ配列(`hWalls`/`vWalls`)へ移行し、回転の壁消失バグを構造的に排除、壁描画を頂点スナップ方式に書き直す。

**Architecture:** `FloorPlan` に `hWalls: WallType[]`(width×(height+1))と `vWalls: WallType[]`((width+1)×height)を追加し `Cell.wall` を削除。壁編集は「頂点スナップ→ドラッグプレビュー→pointer-up で一括 SET_WALLS(undo 1回分)」。DSL 構文は維持しつつ `right`/`bottom` を追加。旧データ移行は不要(SaveData v2 のみ)。

**Tech Stack:** React + TypeScript, Canvas 2D, vitest, pnpm

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-03-wall-edge-restructure-design.md`
- 作業ディレクトリ: `packages/madories`(コマンドはすべてここで実行)
- テスト: `pnpm vitest run <file>`、最終チェック: `pnpm run check && pnpm test`
- Task 1〜9 の間は他ファイルが型エラーになるのは許容(各タスクの対象テストのみ green にする)。Task 10 で全体を green にする。
- コメントは非自明な WHY のみ。docs 追加不可。エラーハンドリング・将来対応の追加不可。
- 旧 `Cell.wall` / `WallFlags` / SaveData v1 への互換コードは書かない。

---

### Task 1: 新データモデルと walls ヘルパー

**Files:**

- Modify: `src/types.ts`
- Create: `src/floor/walls.ts`
- Test: `src/floor/walls.test.ts`

**Interfaces:**

- Produces:
  - `types.ts`: `Cell { floorType; item }`(wall 削除)、`FloorPlan { id; name; width; height; cells; hWalls: WallType[]; vWalls: WallType[] }`、`CopiedRegion { width; height; cells; hWalls; vWalls }`、`EdgeRef { kind: "h" | "v"; x: number; y: number }`、`SaveData.version: 2`
  - `walls.ts`: `hIndex(width, x, y)`, `vIndex(width, x, y)`, `createHWalls(w,h)`, `createVWalls(w,h)`, `getWall(floor, edge)`, `setWallsPure(floor, edges, type): FloorPlan`, `rotateFloorCW90(floor): FloorPlan`

- [ ] **Step 1: types.ts を書き換える**

`src/types.ts` の `WallFlags` を削除し、以下に置換:

```typescript
export interface Cell {
  floorType: FloorType | null;
  item: Item | null;
}

export interface EdgeRef {
  kind: "h" | "v"; // h: 水平壁(セル上辺/下辺), v: 垂直壁(セル左辺/右辺)
  x: number; // h: 0..width-1, v: 0..width
  y: number; // h: 0..height, v: 0..height-1
}

export interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: Cell[];
  hWalls: WallType[]; // width * (height+1), index = y*width + x
  vWalls: WallType[]; // (width+1) * height, index = y*(width+1) + x
}
```

`SaveData.version` を `2` に変更。`CopiedRegion` を:

```typescript
export interface CopiedRegion {
  width: number;
  height: number;
  cells: Cell[];
  hWalls: WallType[]; // width * (height+1)
  vWalls: WallType[]; // (width+1) * height
}
```

- [ ] **Step 2: 失敗するテストを書く** (`src/floor/walls.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { getWall, hIndex, rotateFloorCW90, setWallsPure, vIndex } from "./walls";

describe("walls", () => {
  it("indexes h/v walls", () => {
    expect(hIndex(4, 2, 3)).toBe(3 * 4 + 2);
    expect(vIndex(4, 4, 1)).toBe(1 * 5 + 4);
  });

  it("sets and gets walls including right/bottom boundary", () => {
    let floor = createFloorPlan("t", 3, 2);
    floor = setWallsPure(floor, [{ kind: "h", x: 1, y: 2 }], "solid"); // 下端
    floor = setWallsPure(floor, [{ kind: "v", x: 3, y: 0 }], "window_full"); // 右端
    expect(getWall(floor, { kind: "h", x: 1, y: 2 })).toBe("solid");
    expect(getWall(floor, { kind: "v", x: 3, y: 0 })).toBe("window_full");
  });

  it("rotateFloorCW90 maps left wall to top wall", () => {
    let floor = createFloorPlan("t", 3, 2);
    floor = setWallsPure(floor, [{ kind: "v", x: 1, y: 0 }], "solid");
    const r = rotateFloorCW90(floor);
    // 頂点写像 (vx,vy)→(h-vy,vx): (1,0)-(1,1) → (2,1)-(1,1) = h エッジ (1,1)
    expect(r.width).toBe(2);
    expect(r.height).toBe(3);
    expect(getWall(r, { kind: "h", x: 1, y: 1 })).toBe("solid");
  });

  it("rotateFloorCW90 preserves top-row walls (old bug)", () => {
    let floor = createFloorPlan("t", 3, 2);
    floor = setWallsPure(floor, [{ kind: "h", x: 0, y: 0 }], "solid");
    const r = rotateFloorCW90(floor);
    // (0,0)-(1,0) → (2,0)-(2,1) = v エッジ x=2(右端)。旧実装ではここで消えていた
    expect(getWall(r, { kind: "v", x: 2, y: 0 })).toBe("solid");
  });

  it("four rotations are identity", () => {
    let floor = createFloorPlan("t", 4, 3);
    floor = setWallsPure(
      floor,
      [
        { kind: "h", x: 0, y: 0 },
        { kind: "h", x: 2, y: 3 },
        { kind: "v", x: 4, y: 1 },
        { kind: "v", x: 1, y: 2 },
      ],
      "solid",
    );
    floor.cells[5] = { floorType: "wood", item: { rotation: 90, type: "sofa" } };
    let r = floor;
    for (let i = 0; i < 4; i++) r = rotateFloorCW90(r);
    expect(r.hWalls).toEqual(floor.hWalls);
    expect(r.vWalls).toEqual(floor.vWalls);
    expect(r.cells).toEqual(floor.cells);
  });
});
```

- [ ] **Step 3: 失敗を確認** — `pnpm vitest run src/floor/walls.test.ts` → FAIL(walls.ts 不在)

- [ ] **Step 4: walls.ts を実装**

```typescript
import type { EdgeRef, FloorPlan, WallType } from "../types";

export function hIndex(width: number, x: number, y: number): number {
  return y * width + x;
}

export function vIndex(width: number, x: number, y: number): number {
  return y * (width + 1) + x;
}

export function createHWalls(width: number, height: number): WallType[] {
  return Array.from({ length: width * (height + 1) }, () => "none" as WallType);
}

export function createVWalls(width: number, height: number): WallType[] {
  return Array.from({ length: (width + 1) * height }, () => "none" as WallType);
}

export function getWall(floor: FloorPlan, edge: EdgeRef): WallType {
  return edge.kind === "h"
    ? floor.hWalls[hIndex(floor.width, edge.x, edge.y)]
    : floor.vWalls[vIndex(floor.width, edge.x, edge.y)];
}

export function setWallsPure(floor: FloorPlan, edges: EdgeRef[], type: WallType): FloorPlan {
  const hWalls = [...floor.hWalls];
  const vWalls = [...floor.vWalls];
  for (const e of edges) {
    if (e.kind === "h") {
      if (e.x >= 0 && e.x < floor.width && e.y >= 0 && e.y <= floor.height) {
        hWalls[hIndex(floor.width, e.x, e.y)] = type;
      }
    } else if (e.x >= 0 && e.x <= floor.width && e.y >= 0 && e.y < floor.height) {
      vWalls[vIndex(floor.width, e.x, e.y)] = type;
    }
  }
  return { ...floor, hWalls, vWalls };
}

// CW90: セル (x,y)→(h-1-y, x)、頂点 (vx,vy)→(h-vy, vx)
export function rotateFloorCW90(floor: FloorPlan): FloorPlan {
  const { width, height, cells } = floor;
  const nw = height;
  const nh = width;
  const newCells = cells.map((c) => c);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = cells[y * width + x];
      newCells[x * nw + (height - 1 - y)] = src.item
        ? {
            floorType: src.floorType,
            item: { ...src.item, rotation: ((src.item.rotation + 90) % 360) as 0 | 90 | 180 | 270 },
          }
        : src;
    }
  }
  const hWalls = createHWalls(nw, nh);
  const vWalls = createVWalls(nw, nh);
  // v エッジ (x, y..y+1) → h エッジ ((h-1-y, x)..(h-y, x))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= width; x++) {
      hWalls[hIndex(nw, height - 1 - y, x)] = floor.vWalls[vIndex(width, x, y)];
    }
  }
  // h エッジ (x..x+1, y) → v エッジ ((h-y, x)..(h-y, x+1))
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      vWalls[vIndex(nw, height - y, x)] = floor.hWalls[hIndex(width, x, y)];
    }
  }
  return { ...floor, cells: newCells, hWalls, height: nh, vWalls, width: nw };
}
```

- [ ] **Step 5: `src/store.ts` の `createCell`/`createFloorPlan` を新型に合わせて最小修正**(このタスクのテストが import するため)

```typescript
function createCell(): Cell {
  return { floorType: null, item: null };
}

export function createFloorPlan(name: string, width = 20, height = 20): FloorPlan {
  return {
    cells: Array.from({ length: width * height }, createCell),
    hWalls: createHWalls(width, height),
    height,
    id: uuidv4(),
    name,
    vWalls: createVWalls(width, height),
    width,
  };
}
```

import に `import { createHWalls, createVWalls } from "./floor/walls";` を追加。store.ts の他の型エラーは Task 2 で解消するため無視。

- [ ] **Step 6: テスト green を確認** — `pnpm vitest run src/floor/walls.test.ts` → PASS
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(madories): edge-based wall model and helpers"`

---

### Task 2: store.ts リワーク

**Files:**

- Modify: `src/store.ts`
- Test: `src/store.test.ts`(既存を書き換え)

**Interfaces:**

- Consumes: Task 1 の `walls.ts` 全関数、`EdgeRef`
- Produces: Action 変更 — `SET_WALL` を削除し `{ type: "SET_WALLS"; floorId: string; edges: EdgeRef[]; wallType: WallType }` を追加。`ROTATE_FLOOR` は `rotateFloorCW90` を呼ぶだけ。他 Action の型・名前は不変。

- [ ] **Step 1: 既存 `src/store.test.ts` を新構造で書き換え、失敗を確認**

既存テストのうち wall/rotate 関連を以下の形に(その他の PLACE_ITEM 等は `wall` プロパティ参照を消すだけで維持):

```typescript
import { describe, expect, it } from "vitest";
import { createBuilding, reducer } from "./store";
import { getWall } from "./floor/walls";

describe("SET_WALLS", () => {
  it("sets multiple edges in one action", () => {
    const b = createBuilding();
    const floorId = b.floors[0].id;
    const next = reducer(b, {
      edges: [
        { kind: "h", x: 0, y: 0 },
        { kind: "h", x: 1, y: 0 },
        { kind: "v", x: 20, y: 5 },
      ],
      floorId,
      type: "SET_WALLS",
      wallType: "solid",
    });
    expect(getWall(next.floors[0], { kind: "h", x: 1, y: 0 })).toBe("solid");
    expect(getWall(next.floors[0], { kind: "v", x: 20, y: 5 })).toBe("solid");
  });
});

describe("ROTATE_FLOOR", () => {
  it("keeps wall count across rotation", () => {
    const b = createBuilding();
    const floorId = b.floors[0].id;
    const withWalls = reducer(b, {
      edges: [
        { kind: "h", x: 3, y: 0 },
        { kind: "v", x: 0, y: 3 },
      ],
      floorId,
      type: "SET_WALLS",
      wallType: "solid",
    });
    const rotated = reducer(withWalls, { floorId, type: "ROTATE_FLOOR" });
    const count = (f: (typeof rotated.floors)[0]) =>
      [...f.hWalls, ...f.vWalls].filter((w) => w !== "none").length;
    expect(count(rotated.floors[0])).toBe(2);
  });
});
```

Run: `pnpm vitest run src/store.test.ts` → FAIL

- [ ] **Step 2: store.ts を実装**

変更点:

1. Action union: `SET_WALL` を削除し `SET_WALLS`(上記型)を追加。
2. reducer `SET_WALLS`:

```typescript
case "SET_WALLS": {
  return updateFloor(state, action.floorId, (floor) =>
    setWallsPure(floor, action.edges, action.wallType),
  );
}
```

3. `ROTATE_FLOOR` の本体を `rotateFloorCW90(floor)` の呼び出しに置換(旧2パス実装を削除)。
4. `CLEAR_FLOOR`: cells リセットに加え `hWalls: createHWalls(floor.width, floor.height), vWalls: createVWalls(floor.width, floor.height)`。
5. `ERASE_CELL`: セル内容クリアに加え、そのセルの4辺を `"none"` に:

```typescript
case "ERASE_CELL": {
  return updateFloor(state, action.floorId, (floor) => {
    const x = action.cellIndex % floor.width;
    const y = Math.floor(action.cellIndex / floor.width);
    const cleared = setWallsPure(
      floor,
      [
        { kind: "h", x, y },
        { kind: "h", x, y: y + 1 },
        { kind: "v", x, y },
        { kind: "v", x: x + 1, y },
      ],
      "none",
    );
    return updateCell(cleared, action.cellIndex, () => createCell());
  });
}
```

6. `ERASE_REGION`: セルの map に加え、範囲内エッジ(x1..x2, y1..y2 のセルの4辺すべて)を `"none"` に。`ERASE_CELL` と同じ4辺列挙を範囲ループで `setWallsPure` に渡す。
7. `PASTE_REGION`: cells コピーに加え region の hWalls/vWalls を貼り付け先へ転写:

```typescript
const hWalls = [...floor.hWalls];
const vWalls = [...floor.vWalls];
for (let ry = 0; ry <= action.region.height; ry++) {
  for (let rx = 0; rx < action.region.width; rx++) {
    const tx = ox + rx;
    const ty = oy + ry;
    if (tx < floor.width && ty <= floor.height) {
      const w = action.region.hWalls[ry * action.region.width + rx];
      if (w !== "none") hWalls[hIndex(floor.width, tx, ty)] = w;
    }
  }
}
for (let ry = 0; ry < action.region.height; ry++) {
  for (let rx = 0; rx <= action.region.width; rx++) {
    const tx = ox + rx;
    const ty = oy + ry;
    if (tx <= floor.width && ty < floor.height) {
      const w = action.region.vWalls[ry * (action.region.width + 1) + rx];
      if (w !== "none") vWalls[vIndex(floor.width, tx, ty)] = w;
    }
  }
}
return { ...floor, cells, hWalls, vWalls };
```

- [ ] **Step 3: green 確認** — `pnpm vitest run src/store.test.ts` → PASS
- [ ] **Step 4: Commit** — `git commit -am "feat(madories): store actions on edge-based walls"`

---

### Task 3: 頂点スナップ入力ロジック

**Files:**

- Create: `src/input/wall-snap.ts`
- Delete: `src/input/wall-logic.ts`, `src/input/wall-logic.test.ts`, `src/input/hit-test.ts`, `src/input/hit-test.test.ts`
- Test: `src/input/wall-snap.test.ts`

**Interfaces:**

- Produces:
  - `snapVertex(mx, my, cellSize, width, height): { vx: number; vy: number }` — 最寄りグリッド頂点(範囲へクランプ)
  - `resolveEdges(start: {vx;vy}, end: {vx;vy}): EdgeRef[]` — 軸整列セグメントのエッジ列(|dx|>=|dy| なら水平)。start==end なら `[]`
  - `nearestEdge(mx, my, cellSize, width, height): EdgeRef | null` — タップ消去用。最寄りエッジ(セル中心から遠い側)。距離が cellSize\*0.35 超なら null

- [ ] **Step 1: 失敗するテストを書く** (`src/input/wall-snap.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import { nearestEdge, resolveEdges, snapVertex } from "./wall-snap";

describe("snapVertex", () => {
  it("snaps to nearest vertex and clamps", () => {
    expect(snapVertex(33, 30, 32, 10, 10)).toEqual({ vx: 1, vy: 1 });
    expect(snapVertex(-5, 500, 32, 10, 10)).toEqual({ vx: 0, vy: 10 });
  });
});

describe("resolveEdges", () => {
  it("returns horizontal run when |dx| >= |dy|", () => {
    expect(resolveEdges({ vx: 1, vy: 2 }, { vx: 4, vy: 3 })).toEqual([
      { kind: "h", x: 1, y: 2 },
      { kind: "h", x: 2, y: 2 },
      { kind: "h", x: 3, y: 2 },
    ]);
  });
  it("returns vertical run when |dy| > |dx|, in any direction", () => {
    expect(resolveEdges({ vx: 2, vy: 5 }, { vx: 2, vy: 2 })).toEqual([
      { kind: "v", x: 2, y: 2 },
      { kind: "v", x: 2, y: 3 },
      { kind: "v", x: 2, y: 4 },
    ]);
  });
  it("returns empty for same vertex", () => {
    expect(resolveEdges({ vx: 3, vy: 3 }, { vx: 3, vy: 3 })).toEqual([]);
  });
});

describe("nearestEdge", () => {
  it("finds top edge near horizontal grid line", () => {
    expect(nearestEdge(48, 2, 32, 10, 10)).toEqual({ kind: "h", x: 1, y: 0 });
  });
  it("finds vertical edge near vertical grid line", () => {
    expect(nearestEdge(63, 48, 32, 10, 10)).toEqual({ kind: "v", x: 2, y: 1 });
  });
  it("returns null far from any line", () => {
    expect(nearestEdge(48, 48, 32, 10, 10)).toBeNull();
  });
});
```

- [ ] **Step 2: 失敗確認** — `pnpm vitest run src/input/wall-snap.test.ts` → FAIL

- [ ] **Step 3: 実装** (`src/input/wall-snap.ts`)

```typescript
import type { EdgeRef } from "../types";

export function snapVertex(
  mx: number,
  my: number,
  cellSize: number,
  width: number,
  height: number,
): { vx: number; vy: number } {
  const vx = Math.min(width, Math.max(0, Math.round(mx / cellSize)));
  const vy = Math.min(height, Math.max(0, Math.round(my / cellSize)));
  return { vx, vy };
}

export function resolveEdges(
  start: { vx: number; vy: number },
  end: { vx: number; vy: number },
): EdgeRef[] {
  const dx = end.vx - start.vx;
  const dy = end.vy - start.vy;
  if (dx === 0 && dy === 0) {
    return [];
  }
  const edges: EdgeRef[] = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    const x0 = Math.min(start.vx, end.vx);
    for (let x = x0; x < x0 + Math.abs(dx); x++) {
      edges.push({ kind: "h", x, y: start.vy });
    }
  } else {
    const y0 = Math.min(start.vy, end.vy);
    for (let y = y0; y < y0 + Math.abs(dy); y++) {
      edges.push({ kind: "v", x: start.vx, y });
    }
  }
  return edges;
}

export function nearestEdge(
  mx: number,
  my: number,
  cellSize: number,
  width: number,
  height: number,
): EdgeRef | null {
  const threshold = cellSize * 0.35;
  const distH = Math.abs(my - Math.round(my / cellSize) * cellSize);
  const distV = Math.abs(mx - Math.round(mx / cellSize) * cellSize);
  if (distH > threshold && distV > threshold) {
    return null;
  }
  if (distH <= distV) {
    const y = Math.min(height, Math.max(0, Math.round(my / cellSize)));
    const x = Math.min(width - 1, Math.max(0, Math.floor(mx / cellSize)));
    return { kind: "h", x, y };
  }
  const x = Math.min(width, Math.max(0, Math.round(mx / cellSize)));
  const y = Math.min(height - 1, Math.max(0, Math.floor(my / cellSize)));
  return { kind: "v", x, y };
}
```

- [ ] **Step 4: green 確認** — `pnpm vitest run src/input/wall-snap.test.ts` → PASS
- [ ] **Step 5: 旧ファイル削除** — `git rm src/input/wall-logic.ts src/input/wall-logic.test.ts src/input/hit-test.ts src/input/hit-test.test.ts`(参照元は Task 5 で修正)
- [ ] **Step 6: Commit** — `git commit -am "feat(madories): vertex-snap wall input logic"`

---

### Task 4: 描画系(draw-walls + プレビュー)

**Files:**

- Modify: `src/draw/draw-walls.ts`
- Modify: `src/components/hooks/use-canvas-draw.ts`

**Interfaces:**

- Consumes: `floor.hWalls` / `floor.vWalls`, `EdgeRef`
- Produces:
  - `drawWalls(ctx, floor, cellSize, colors)` — シグネチャ不変、内部をエッジ配列走査に変更
  - `drawWallPreview(ctx, edges: EdgeRef[], cellSize, color: string)` — draw-walls.ts に追加 export
  - `use-canvas-draw.ts` の redraw が `ghost` に加えて `wallPreview?: EdgeRef[]` を受け取り動的キャンバスに半透明で描く

- [ ] **Step 1: draw-walls.ts のループを書き換え**

`drawWalls` 本体を:

```typescript
export function drawWalls(
  ctx: CanvasRenderingContext2D,
  floor: FloorPlan,
  cellSize: number,
  colors: { ink: string; windowBlue: string },
): void {
  const { width, height, hWalls, vWalls } = floor;
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      drawEdge(ctx, hWalls[y * width + x], x * cellSize, y * cellSize, true, cellSize, colors);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= width; x++) {
      drawEdge(
        ctx,
        vWalls[y * (width + 1) + x],
        x * cellSize,
        y * cellSize,
        false,
        cellSize,
        colors,
      );
    }
  }
}
```

`drawEdge` は変更なし。末尾に追加:

```typescript
export function drawWallPreview(
  ctx: CanvasRenderingContext2D,
  edges: EdgeRef[],
  cellSize: number,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (const e of edges) {
    ctx.beginPath();
    ctx.moveTo(e.x * cellSize, e.y * cellSize);
    ctx.lineTo(
      (e.x + (e.kind === "h" ? 1 : 0)) * cellSize,
      (e.y + (e.kind === "v" ? 1 : 0)) * cellSize,
    );
    ctx.stroke();
  }
  ctx.restore();
}
```

import に `EdgeRef` を追加。

- [ ] **Step 2: use-canvas-draw.ts を修正**

redraw のシグネチャを `redraw(ghost?, wallPreview?: EdgeRef[])` に拡張(既存呼び出しは互換)。動的キャンバス描画パスの最後に:

```typescript
if (wallPreview && wallPreview.length > 0) {
  drawWallPreview(dynCtx, wallPreview, cellSize, "rgba(37, 99, 235, 0.7)");
}
```

ファイル内の `cell.wall` 参照が他にあれば hWalls/vWalls 走査へ書き換える。

- [ ] \*\*Step 3: 型チェック(対象ファイルのみ目視 + `pnpm run check` は失敗してよいが draw-walls 起因のエラーが無いこと)
- [ ] **Step 4: Commit** — `git commit -am "feat(madories): edge-array wall rendering and drag preview"`

---

### Task 5: ポインタハンドラの壁ツール書き換え

**Files:**

- Modify: `src/components/hooks/use-pointer-handlers.ts`
- Modify: `src/components/floor-canvas.tsx`(props の `onSetWall` → `onSetWalls` 配線)
- Modify: `src/components/App.tsx`(dispatch `SET_WALLS`)
- Modify: `src/input/item-logic.ts`(`endCell` のデフォルト値から `wall` を削除。`item-logic.test.ts` も同様)

**Interfaces:**

- Consumes: Task 3 `snapVertex`/`resolveEdges`/`nearestEdge`、Task 4 の `redraw(ghost, wallPreview)`
- Produces: Props 変更 `onSetWalls: (edges: EdgeRef[], wallType: WallType) => void`

- [ ] **Step 1: use-pointer-handlers.ts の壁ツール部分を置換**

削除する ref: `lastWallHitRef`, `wallDragStartPos`, `wallDragEdgeLock`, `wallDragLastPos`, `wallStopTimerRef` と関連関数 `applyWallSegment`, `applyWallHit`、`resolveWallSegments`/hit-test import。

追加する ref:

```typescript
const wallStartVertexRef = useRef<{ vx: number; vy: number } | null>(null);
const wallPreviewRef = useRef<EdgeRef[]>([]);
```

`handlePointerDown` の wall 分岐:

```typescript
if (tool.kind === "wall") {
  wallStartVertexRef.current = snapVertex(mx, my, cellSize, floor.width, floor.height);
  wallPreviewRef.current = [];
  startLongPress(e.clientX, e.clientY);
  return;
}
```

`handlePointerMove` の wall 分岐:

```typescript
if (tool.kind === "wall" && wallStartVertexRef.current && e.buttons === 1) {
  const end = snapVertex(mx, my, cellSize, floor.width, floor.height);
  wallPreviewRef.current = resolveEdges(wallStartVertexRef.current, end);
  if (wallPreviewRef.current.length > 0 && longPressTimerRef.current) {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }
  redraw(undefined, wallPreviewRef.current);
  return;
}
```

`handlePointerUp` の wall 分岐:

```typescript
if (tool.kind === "wall") {
  const start = wallStartVertexRef.current;
  wallStartVertexRef.current = null;
  const edges = wallPreviewRef.current;
  wallPreviewRef.current = [];
  if (edges.length > 0) {
    onSetWalls(edges, tool.wallType);
  } else if (start) {
    // タップ: 最寄りエッジを消す
    const { mx, my } = getCanvasPos(e.clientX, e.clientY);
    const edge = nearestEdge(mx, my, cellSize, floor.width, floor.height);
    if (edge) {
      onSetWalls([edge], "none");
    }
  }
  redraw();
  return;
}
```

2本目タッチによるキャンセル箇所(`activePointerCountRef.current >= 2`)では `wallStartVertexRef.current = null; wallPreviewRef.current = [];` に置換。
`handlePointerCancel` でも同様にクリアして `redraw()`。

- [ ] **Step 2: floor-canvas.tsx / App.tsx の配線変更**

`onSetWall(cellIndex, edge, wallType)` を `onSetWalls(edges, wallType)` に。App.tsx 側 dispatch:

```typescript
onSetWalls={(edges, wallType) =>
  dispatch({ edges, floorId: activeFloor.id, type: "SET_WALLS", wallType })
}
```

(実際の props 名・dispatch 形式は既存コードの流儀に合わせる。)

- [ ] **Step 3: item-logic.ts の `wall` 参照除去** — `endCell` デフォルト `{ floorType: null, item: null }`。item-logic.test.ts のフィクスチャも同様。
- [ ] **Step 4: 動作テスト** — `pnpm vitest run src/input/item-logic.test.ts` → PASS
- [ ] **Step 5: Commit** — `git commit -am "feat(madories): vertex-snap wall drawing interaction"`

---

### Task 6: room-detection.ts 追従

**Files:**

- Modify: `src/floor/room-detection.ts`
- Test: 既存 `src/floor/room-detection.test.ts` があれば新構造に書き換え、なければ最小テスト追加

**Interfaces:**

- Consumes: `floor.hWalls`/`floor.vWalls`
- Produces: `detectRooms(floor)` / `drawRoomLabels(...)` シグネチャ不変

- [ ] **Step 1: `isBlocked` をエッジ配列版に置換**

```typescript
function isBlocked(
  floor: FloorPlan,
  fromIdx: number,
  dir: "top" | "left" | "bottom" | "right",
): boolean {
  const { width, height, hWalls, vWalls } = floor;
  const x = fromIdx % width;
  const y = Math.floor(fromIdx / width);
  if (dir === "top") return y === 0 || hWalls[y * width + x] !== "none";
  if (dir === "bottom") return y + 1 >= height || hWalls[(y + 1) * width + x] !== "none";
  if (dir === "left") return x === 0 || vWalls[y * (width + 1) + x] !== "none";
  return x + 1 >= width || vWalls[y * (width + 1) + x + 1] !== "none";
}
```

- [ ] **Step 2: テスト**(4セル部屋を壁で囲って detectRooms が1部屋返すこと、`setWallsPure` で構築)を実行して PASS
- [ ] **Step 3: Commit** — `git commit -am "refactor(madories): room detection on edge walls"`

---

### Task 7: DSL 追従(構文維持 + right/bottom 追加)

**Files:**

- Modify: `src/floor/dsl.ts`
- Modify: `src/floor/dsl.test.ts`

**Interfaces:**

- Consumes: `walls.ts` の index/create ヘルパー、`detectRooms`
- Produces: `floorToDsl(floor)` / `dslToFloor(text)` シグネチャ不変。構文: `wall <coords> top|left|right|bottom <type>`。シリアライザは内部エッジを top/left で正規化し、下端行(y=height)は `(x,height-1) bottom`、右端列(x=width)は `(width-1,y) right` で出力。

**設計方針:** cell 単位の wallTop/wallLeft を廃止し、DSL 内部表現をエッジ集合に統一する。

- [ ] **Step 1: round-trip テストを拡張**(dsl.test.ts に追加)

```typescript
it("round-trips right/bottom boundary walls", () => {
  let floor = createFloorPlan("t", 4, 4);
  floor = setWallsPure(floor, [{ kind: "v", x: 4, y: 2 }], "solid");
  floor = setWallsPure(floor, [{ kind: "h", x: 1, y: 4 }], "window_full");
  const text = floorToDsl(floor);
  expect(text).toContain("right");
  expect(text).toContain("bottom");
  const back = dslToFloor(text);
  expect(getWall(back, { kind: "v", x: 4, y: 2 })).toBe("solid");
  expect(getWall(back, { kind: "h", x: 1, y: 4 })).toBe("window_full");
});
```

既存 round-trip テストは `cell.wall` 参照をエッジ getter に書き換えて維持。Run → FAIL 確認。

- [ ] **Step 2: side→エッジ変換ヘルパーを dsl.ts 冒頭に追加**

```typescript
type Side = "top" | "left" | "right" | "bottom";

function sideToEdge(x: number, y: number, side: Side): EdgeRef {
  if (side === "top") return { kind: "h", x, y };
  if (side === "bottom") return { kind: "h", x, y: y + 1 };
  if (side === "left") return { kind: "v", x, y };
  return { kind: "v", x: x + 1, y };
}
```

- [ ] **Step 3: パーサ修正**

- 正規表現の `(?<edge>top|left)` を `(?<side>top|left|right|bottom)` に(メイン・pattern 内の両方)。
- `applyWall`: coords 範囲の各セルに `sideToEdge` を適用しエッジ集合 `Map<string, WallType>`(key = `"h:x:y"` / `"v:x:y"`)へ書き込み。範囲判定はエッジ座標で行う(h: x<width && y<=height, v: x<=width && y<height)。
- `cellOverrides` の `wall` プロパティ利用をやめ、最終組み立てで `hWalls`/`vWalls` を `createHWalls`/`createVWalls` で作りエッジ集合を書き込む。
- `PatternCell` から `wallTop`/`wallLeft` を削除し、パターンを `{ cells: PatternCell[]; walls: { edge: EdgeRef; type: WallType }[] }` に変更。`upsertPatternWall` はエッジ配列への push/上書きに変更。
- `rotatePatternCW90`: セルは現行どおり `(x,y)→(maxY-y, x)`。壁エッジは頂点写像 `(vx,vy)→(maxY+1-vy, vx)` で変換:

```typescript
function rotateEdgeCW90(e: EdgeRef, maxY: number): EdgeRef {
  // h (x..x+1, y) → v (maxY+1-y, x..x+1) / v (x, y..y+1) → h (maxY-y .. maxY+1-y, x)
  return e.kind === "h"
    ? { kind: "v", x: maxY + 1 - e.y, y: e.x }
    : { kind: "h", x: maxY - e.y, y: e.x };
}
```

- `applyPatternCells`: 壁は place オフセットを足して同じエッジ集合へ書き込み。

- [ ] **Step 4: シリアライザ修正**

- `packWallRuns(cells, ...)` を `packWallRuns(hWalls, vWalls, width, height)` に変更: h 壁は各 y 行(0..height)を x 方向 run-length、v 壁は各 x 列(0..width)を y 方向 run-length。
- run の出力: h で y<height → `wall (x1,y)-(x2,y) top`、y===height → `wall (x1,height-1)-(x2,height-1) bottom`。v で x<width → `left`、x===width → `wall (width-1,y1)-(width-1,y2) right`。
- 部屋パターン抽出(virtualCells への壁引き込み処理 dsl.ts 旧184-213行)は「部屋セル集合に接する全エッジ」をローカル座標のエッジ集合として直接収集する方式に単純化(仮想グリッド +2 マージン不要):部屋セル (x,y) につき4辺 `sideToEdge` を集め、グローバルエッジ配列から type を引いてローカル座標(minX/minY 減算、エッジ座標も同じオフセット)で保持。パターン出力もエッジ run-length で。

- [ ] **Step 5: green 確認** — `pnpm vitest run src/floor/dsl.test.ts` → PASS
- [ ] **Step 6: Commit** — `git commit -am "feat(madories): DSL on edge walls with right/bottom sides"`

---

### Task 8: clipboard / export 追従

**Files:**

- Modify: `src/floor/clipboard-logic.ts`
- Modify: `src/floor/clipboard-logic.test.ts`
- Modify: `src/draw/export.ts`(`cell.wall` 参照箇所をエッジ配列に書き換え)

**Interfaces:**

- Consumes: `CopiedRegion`(Task 1 の新型)、`hIndex`/`vIndex`
- Produces: `copyRegion(floor, sel): CopiedRegion | null` — 領域のセルと、その領域内のエッジ(境界含む: h は (y1..y2+1)×(x1..x2)、v は (y1..y2)×(x1..x2+1))を切り出す

- [ ] **Step 1: clipboard-logic.test.ts に壁コピーのテストを追加し FAIL 確認**

```typescript
it("copies boundary walls of the region", () => {
  let floor = createFloorPlan("t", 5, 5);
  floor = setWallsPure(floor, [{ kind: "h", x: 1, y: 3 }], "solid"); // (1,2)セルの下辺
  const region = copyRegion(floor, { x1: 1, y1: 1, x2: 2, y2: 2 })!;
  expect(region.hWalls[(3 - 1) * region.width + (1 - 1)]).toBe("solid");
});
```

- [ ] **Step 2: copyRegion 実装** — cells 切り出し(現行)に加え:

```typescript
const hWalls: WallType[] = [];
for (let cy = minY; cy <= maxY + 1; cy++) {
  for (let cx = minX; cx <= maxX; cx++) {
    hWalls.push(floor.hWalls[hIndex(floor.width, cx, cy)]);
  }
}
const vWalls: WallType[] = [];
for (let cy = minY; cy <= maxY; cy++) {
  for (let cx = minX; cx <= maxX + 1; cx++) {
    vWalls.push(floor.vWalls[vIndex(floor.width, cx, cy)]);
  }
}
return { cells, hWalls, height, vWalls, width };
```

- [ ] **Step 3: export.ts の `cell.wall` 参照**(computeBounds の「空でない判定」や壁寸法計算)を hWalls/vWalls 参照に書き換え。bounds 判定は「セルが非空 or セルのいずれかの辺に壁」で現行意味を維持。
- [ ] **Step 4: green 確認** — `pnpm vitest run src/floor/clipboard-logic.test.ts` → PASS
- [ ] **Step 5: Commit** — `git commit -am "refactor(madories): clipboard/export on edge walls"`

---

### Task 9: 3D プレビュー追従

**Files:**

- Modify: `src/components/preview-3d/scene-model.ts`
- Modify: `src/components/preview-3d/scene-model.test.ts`

**Interfaces:**

- Consumes: `floor.hWalls`/`floor.vWalls`
- Produces: `buildSceneModel(floor)` 出力構造は不変(walls: Box3D[])

- [ ] **Step 1: scene-model.test.ts のフィクスチャを新構造に書き換え**(`cells[0].wall.top = "solid"` → `floor.hWalls[hIndex(w, 0, 0)] = "solid"` の形。ヘルパー `createFloorPlan` 利用)。Run → FAIL
- [ ] **Step 2: scene-model.ts の run 抽出ループを書き換え** — top run 抽出(旧 84 行付近)は `hWalls` を y=0..height の各行で走査、left run 抽出(旧 99 行付近)は `vWalls` を x=0..width の各列で走査。run の `fixed`/`start`/`end` セマンティクスは既存のまま(行/列とその範囲)。
- [ ] **Step 3: green 確認** — `pnpm vitest run src/components/preview-3d` → PASS
- [ ] **Step 4: Commit** — `git commit -am "refactor(madories): 3d preview on edge walls"`

---

### Task 10: storage v2・share・全体 green

**Files:**

- Modify: `src/storage.ts`(version 2、v1 は不正データ扱い=読み込み失敗で新規プラン)
- Modify: `src/storage.test.ts`
- Modify: `src/floor/share.ts`(型追従のみ、DSL 経由なので実質変更小)
- Modify: 残る `cell.wall` / `WallFlags` / `SET_WALL` 参照すべて(`grep -rn "\.wall\b\|WallFlags\|SET_WALL\b" src` で洗い出し)

- [ ] **Step 1: storage.ts** — `version: 2` で保存。読み込み時 `data.version !== 2` なら null(新規プラン)。storage.test.ts を追従。
- [ ] **Step 2: 残存参照の一掃** — `grep -rn "wall\." src | grep -v hWalls | grep -v vWalls` と `grep -rn "WallFlags\|SET_WALL\b" src` がゼロ件になるまで修正。
- [ ] **Step 3: 全体 green** — `pnpm run check && pnpm test` → PASS(Expected: 型エラー0、全テストPASS)
- [ ] **Step 4: フォーマット** — `pnpm run format`
- [ ] **Step 5: Commit** — `git commit -am "feat(madories): complete edge-wall migration (SaveData v2)"`

---

### Task 11: 実機検証

- [ ] **Step 1:** `pnpm dev` でアプリを起動し、webapp-testing 相当のブラウザ操作で確認:
  1. 壁ツールでドラッグ → プレビューが出て確定される
  2. グリッド右端・下端に壁が引ける
  3. タップで壁が消える
  4. 回転を4回 → 元の間取りに戻る(壁が消えない)
  5. DSL パネルで export → import round-trip
  6. 3D プレビュー表示
- [ ] **Step 2:** 問題があれば修正して commit
