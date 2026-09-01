import type { FloorPlan } from "../types";
import { isStructuralWall } from "./shear-walls";
import { hIndex, vIndex } from "./walls";

// 2F床を支える1F支持点（柱・耐力壁）から、この距離を超える2F床領域は
// 「大スパン（構造的に重い）」とみなす。簡易目安: 3.6m（≈4 cells）。
export const SUPPORT_SPAN_MAX_M = 3.6;

export interface FloorDeckCell {
  x: number;
  y: number;
  /** Distance (m) from this floor cell's center to the nearest 1F support */
  spanM: number;
}

export interface FloorSupport {
  /** Upper floor index of the pair (supported by floors[floorIndex-1]) */
  floorIndex: number;
  /** Every deck cell with its computed span */
  cells: FloorDeckCell[];
  /** Number of cells whose span exceeds SUPPORT_SPAN_MAX_M */
  overCount: number;
  /** Widest span found on this floor (m) */
  maxSpanM: number;
}

/**
 * All grid vertices incident to a structural (solid) wall edge on `floor` —
 * the load-bearing "support points" (walls carry vertical load along their
 * length, so every wall-line vertex counts as support).
 */
function supportVertices(floor: FloorPlan): Array<[number, number]> {
  const { width, height, hWalls, vWalls } = floor;
  const set = new Set<string>();
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isStructuralWall(hWalls[hIndex(width, x, y)])) {
        continue;
      }
      set.add(`${x},${y}`);
      set.add(`${x + 1},${y}`);
    }
  }
  for (let x = 0; x <= width; x++) {
    for (let y = 0; y < height; y++) {
      if (!isStructuralWall(vWalls[vIndex(width, x, y)])) {
        continue;
      }
      set.add(`${x},${y}`);
      set.add(`${x},${y + 1}`);
    }
  }
  const out: Array<[number, number]> = [];
  for (const s of set.values()) {
    const [x, y] = s.split(",").map(Number);
    out.push([x, y]);
  }
  return out;
}

/**
 * 2F床の支持評価: 各床セルの中心から最も近い1F支持点（柱・耐力壁の線）までの
 * 距離（＝見かけの梁スパン）を計算し、スパン分布を返す。Floors は bottom-up
 * （index 0 = 1F）。1F は基礎で受けるので i>=1 のみ評価（floors[i-1] が受ける）。
 */
export function computeFloorSupport(floors: FloorPlan[]): FloorSupport[] {
  const out: FloorSupport[] = [];
  for (let i = 1; i < floors.length; i++) {
    const lower = floors[i - 1];
    const upper = floors[i];
    const supports = supportVertices(lower);
    const cells: FloorDeckCell[] = [];
    let overCount = 0;
    let maxSpanM = 0;
    for (let y = 0; y < upper.height; y++) {
      for (let x = 0; x < upper.width; x++) {
        const cell = upper.cells[y * upper.width + x];
        if (!cell.floorType) {
          continue; // Only actual floor deck needs support
        }
        let best = Infinity;
        for (const [sx, sy] of supports) {
          const d = Math.hypot(sx - x, sy - y);
          if (d < best) {
            best = d;
          }
        }
        if (best === Infinity) {
          continue;
        }
        // 支持までの距離は「半スパン」。床梁が渡る実質スパンは両側で約2倍。
        const spanM = best * 0.91 * 2;
        if (spanM > maxSpanM) {
          maxSpanM = spanM;
        }
        if (spanM > SUPPORT_SPAN_MAX_M) {
          overCount++;
        }
        cells.push({ x, y, spanM });
      }
    }
    if (cells.length > 0) {
      out.push({ floorIndex: i, cells, overCount, maxSpanM });
    }
  }
  return out;
}
