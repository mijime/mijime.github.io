import type { Cell, EdgeRef, FloorPlan, ItemType, WallType } from "../types";
import { ITEM_DEF_MAP } from "../items";

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

// 家具アンカーは占有域の左上。回転・反転では占有域ごと写像した左上が新アンカーになる。
// 未知の家具種別は1x1扱い(従来通りの単セル写像に退化)。
// 回転値を考慮した占有サイズ(90/270度なら縦横入替)。
function currentSize(type: ItemType, rotation: 0 | 90 | 180 | 270): { w: number; h: number } {
  const def = ITEM_DEF_MAP.get(type);
  const w = def?.w ?? 1;
  const h = def?.h ?? 1;
  return rotation === 90 || rotation === 270 ? { h: w, w: h } : { h, w };
}

// CW90: セル (x,y)→(h-1-y, x)、頂点 (vx,vy)→(h-vy, vx)
// 家具アンカー (x,y)[w,h] → (h-y-h, x)
export function rotateFloorCW90(floor: FloorPlan): FloorPlan {
  const { width, height, cells } = floor;
  const nw = height;
  const nh = width;
  // Pass 1: 床材は単セルで回転、家具は剥がす
  const newCells: Cell[] = cells.map((c) => c);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = cells[y * width + x];
      newCells[x * nw + (height - 1 - y)] = { ...src, item: null };
    }
  }
  // Pass 2: 家具は占有域写像した左上へ。はみ出し配置で範囲外になる場合のみ
  // 従来の単セル写像にフォールバック(家具を消さないため)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = cells[y * width + x];
      if (!src.item) {
        continue;
      }
      const { h } = currentSize(src.item.type, src.item.rotation);
      let nx = height - y - h;
      const ny = x;
      if (nx < 0 || nx >= nw) {
        nx = height - 1 - y;
      }
      newCells[ny * nw + nx] = {
        ...newCells[ny * nw + nx],
        item: { ...src.item, rotation: ((src.item.rotation + 90) % 360) as 0 | 90 | 180 | 270 },
      };
    }
  }
  const hWalls = createHWalls(nw, nh);
  const vWalls = createVWalls(nw, nh);
  // V エッジ (x, y..y+1) → h エッジ ((h-1-y, x)..(h-y, x))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= width; x++) {
      hWalls[hIndex(nw, height - 1 - y, x)] = floor.vWalls[vIndex(width, x, y)];
    }
  }
  // H エッジ (x..x+1, y) → v エッジ ((h-y, x)..(h-y, x+1))
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      vWalls[vIndex(nw, height - y, x)] = floor.hWalls[hIndex(width, x, y)];
    }
  }
  return { ...floor, cells: newCells, hWalls, height: nh, vWalls, width: nw };
}

// 鏡映では家具の向きが反転する。左右反転: r → -r、上下反転: r → 180-r。
function mirroredRotationH(rotation: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  return ((360 - rotation) % 360) as 0 | 90 | 180 | 270;
}

function mirroredRotationV(rotation: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  return ((180 - rotation + 360) % 360) as 0 | 90 | 180 | 270;
}

// 左右反転: セル (x,y)→(w-1-x, y)、h エッジ (x,y)→(w-1-x, y)、v エッジ (x,y)→(w-x, y)
// 家具アンカー (x,y)[w,h] → (w-x-w, y)
export function flipFloorH(floor: FloorPlan): FloorPlan {
  const { width, height, cells } = floor;
  const newCells: Cell[] = cells.map((c) => c);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = cells[y * width + x];
      newCells[y * width + (width - 1 - x)] = { ...src, item: null };
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = cells[y * width + x];
      if (!src.item) {
        continue;
      }
      const { w } = currentSize(src.item.type, src.item.rotation);
      let nx = width - x - w;
      if (nx < 0 || nx >= width) {
        nx = width - 1 - x;
      }
      newCells[y * width + nx] = {
        ...newCells[y * width + nx],
        item: { ...src.item, rotation: mirroredRotationH(src.item.rotation) },
      };
    }
  }
  const hWalls = createHWalls(width, height);
  const vWalls = createVWalls(width, height);
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      hWalls[hIndex(width, width - 1 - x, y)] = floor.hWalls[hIndex(width, x, y)];
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= width; x++) {
      vWalls[vIndex(width, width - x, y)] = floor.vWalls[vIndex(width, x, y)];
    }
  }
  return { ...floor, cells: newCells, hWalls, vWalls };
}

// 上下反転: セル (x,y)→(x, h-1-y)、h エッジ (x,y)→(x, h-y)、v エッジ (x,y)→(x, h-1-y)
// 家具アンカー (x,y)[w,h] → (x, h-y-h)
export function flipFloorV(floor: FloorPlan): FloorPlan {
  const { width, height, cells } = floor;
  const newCells: Cell[] = cells.map((c) => c);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = cells[y * width + x];
      newCells[(height - 1 - y) * width + x] = { ...src, item: null };
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = cells[y * width + x];
      if (!src.item) {
        continue;
      }
      const { h } = currentSize(src.item.type, src.item.rotation);
      let ny = height - y - h;
      if (ny < 0 || ny >= height) {
        ny = height - 1 - y;
      }
      newCells[ny * width + x] = {
        ...newCells[ny * width + x],
        item: { ...src.item, rotation: mirroredRotationV(src.item.rotation) },
      };
    }
  }
  const hWalls = createHWalls(width, height);
  const vWalls = createVWalls(width, height);
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      hWalls[hIndex(width, x, height - y)] = floor.hWalls[hIndex(width, x, y)];
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x <= width; x++) {
      vWalls[vIndex(width, x, height - 1 - y)] = floor.vWalls[vIndex(width, x, y)];
    }
  }
  return { ...floor, cells: newCells, hWalls, vWalls };
}
