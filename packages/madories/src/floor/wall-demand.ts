import type { Building, ConstructionPreset, FloorPlan, StructuralConditions } from "../types";
import { MM_PER_CELL } from "../units";
import { computeEccentricity, type Eccentricity } from "./stiffness";
import { computeSeismicShear } from "./loads";
import { detectShearWallRuns } from "./shear-walls";
import {
  BASE_STRENGTH_PER_MULTIPLIER,
  normalizeStructuralConditions,
  wallMultiplier,
} from "./structural-conditions";

// 壁ごとの負担せん断と検定比（負荷 ÷ 耐力）。
//
// 剛床仮定で水平力を剛性比例配分すると、負荷も耐力も「壁倍率×長さ」に比例する
// ため全壁の検定比が同じ値になり差が出ない。そこで **ねじれ（偏心）による加算**
// を入れる: 剛心から離れた壁ほど余分に負担する。これで「どの壁がつらいか」が見える。
//
//   V_j = Qi·k_j/Σk  +  M·k_j·d_j / Σ(k_i·d_i²)
//     M  = Qi × (重心と剛心のズレ)   d_j = 壁の位置 − 剛心
//
// 単位: V, 耐力は N、位置・ズレは mm、k は「壁倍率×長さ(m)」。

export interface WallDemand {
  kind: "h" | "v";
  x: number;
  y: number;
  cells: number;
  lengthM: number;
  multiplier: number;
  /** 負担せん断力 (kN、ねじれ込み・符号付き) */
  shearKn: number;
  /** 短期耐力 (kN) = 壁倍率 × 長さ × 1.96 */
  capacityKn: number;
  /** 検定比 = |負担| ÷ 耐力 */
  utilization: number;
}

export function computeWallDemands(
  floor: FloorPlan,
  storyShearN: number,
  eccentricity: Eccentricity | null,
  construction: ConstructionPreset,
  mmPerCell: number = MM_PER_CELL,
): WallDemand[] {
  const multiplier = wallMultiplier(construction, "solid");
  if (multiplier <= 0) {
    return [];
  }
  const runs = detectShearWallRuns(floor, mmPerCell);
  const kOf = (cells: number) => multiplier * ((cells * mmPerCell) / 1000);
  const cy = eccentricity?.cyMm ?? 0;
  const cx = eccentricity?.cxMm ?? 0;
  const ey = eccentricity ? eccentricity.gyMm - eccentricity.cyMm : 0;
  const ex = eccentricity ? eccentricity.gxMm - eccentricity.cxMm : 0;

  let sumH = 0;
  let sumV = 0;
  let sumHd2 = 0;
  let sumVd2 = 0;
  for (const r of runs) {
    const k = kOf(r.cells);
    if (r.kind === "h") {
      const d = r.y * mmPerCell - cy;
      sumH += k;
      sumHd2 += k * d * d;
    } else {
      const d = r.x * mmPerCell - cx;
      sumV += k;
      sumVd2 += k * d * d;
    }
  }

  const momentH = storyShearN * ey; // N·mm（X方向力のねじれ）
  const momentV = storyShearN * ex; // Y方向力のねじれ

  return runs.map((r) => {
    const k = kOf(r.cells);
    const capacityN = k * BASE_STRENGTH_PER_MULTIPLIER * 1000;
    let shearN: number;
    if (r.kind === "h") {
      shearN = sumH > 0 ? (storyShearN * k) / sumH : 0;
      if (sumHd2 > 0) {
        shearN += (momentH * k * (r.y * mmPerCell - cy)) / sumHd2;
      }
    } else {
      shearN = sumV > 0 ? (storyShearN * k) / sumV : 0;
      if (sumVd2 > 0) {
        shearN += (momentV * k * (r.x * mmPerCell - cx)) / sumVd2;
      }
    }
    return {
      capacityKn: capacityN / 1000,
      cells: r.cells,
      kind: r.kind,
      lengthM: (r.cells * mmPerCell) / 1000,
      multiplier,
      shearKn: shearN / 1000,
      utilization: capacityN > 0 ? Math.abs(shearN) / capacityN : 0,
      x: r.x,
      y: r.y,
    };
  });
}

/** 1階ぶんの壁負担を、建物全体から層せん断力を引いて求める。 */
export function computeFloorWallDemands(
  floor: FloorPlan,
  floors: FloorPlan[],
  structural: StructuralConditions | Partial<StructuralConditions> | undefined,
): WallDemand[] {
  const conditions = normalizeStructuralConditions(structural);
  const building: Building = { cellSize: 0, floors, structural: conditions };
  const seismic = computeSeismicShear(building, conditions);
  const index = floors.findIndex((f) => f.id === floor.id);
  const shearN = seismic[Math.max(index, 0)]?.shearN ?? 0;
  return computeWallDemands(floor, shearN, computeEccentricity(floor), conditions.construction);
}
