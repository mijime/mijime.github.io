import type { Building, FloorPlan, StructuralConditions } from "../types";
import { MM_PER_CELL } from "../units";
import { computeWallBounds } from "./quadrant-balance";
import {
  BASE_STRENGTH_PER_MULTIPLIER,
  isHeavySnowRegion,
  normalizeStructuralConditions,
  regionConditions,
} from "./structural-conditions";

// 荷重・外力（令84〜88条）の簡易集計。木造住宅の実務的な代表値を既定に持ち、
// 面積は wall の外接矩形で近似する（既存の壁量チェックと同じ割り切り）。
// 単位荷重は住宅の居室（令85条 地震用 600 N/m²）を既定とする。

/** 積雪の単位荷重 (N/m²/cm): 普通区域20・多雪区域30（令86条2項）。 */
export const SNOW_UNIT_PER_CM = 20;
export const SNOW_UNIT_PER_CM_HEAVY = 30;

/**
 * 標準せん断力係数 C0（令88条）。壁量計算（ルート1）にならい 0.2 とし、
 * 層せん断力係数分布 Ai は 1.0（低層の簡略化）として扱う。
 */
export const STANDARD_SHEAR_COEFFICIENT = 0.2;

export interface UnitLoads {
  /** 屋根固定荷重 N/m²（水平投影） */
  roof: number;
  /** 床固定荷重 N/m² */
  floor: number;
  /** 外壁固定荷重 N/m²（見付面積あたり） */
  exteriorWall: number;
  /** 内壁（間仕切り）固定荷重 N/m²（床面積あたりの概算） */
  interiorWall: number;
  /** 積載荷重（地震用、住宅）N/m² */
  liveSeismic: number;
}

export const DEFAULT_UNIT_LOADS: UnitLoads = {
  exteriorWall: 700,
  floor: 400,
  interiorWall: 400,
  liveSeismic: 600,
  roof: 700,
};

export interface StoryGeometry {
  floorIndex: number;
  /** 床面積 (m²) */
  areaM2: number;
  /** 外周長 (m) */
  perimeterM: number;
  /** 階高 (m) */
  storyHeightM: number;
}

export function computeStoryGeometries(
  floors: FloorPlan[],
  conditions: Partial<StructuralConditions> | undefined,
  mmPerCell: number = MM_PER_CELL,
): StoryGeometry[] {
  const storyHeightM = normalizeStructuralConditions(conditions).storyHeightMm / 1000;
  return floors.map((floor, floorIndex) => {
    const b = computeWallBounds(floor);
    if (!b) {
      return { areaM2: 0, floorIndex, perimeterM: 0, storyHeightM };
    }
    const wCells = b.maxX - b.minX;
    const hCells = b.maxY - b.minY;
    const cellM = mmPerCell / 1000;
    return {
      areaM2: wCells * hCells * cellM * cellM,
      floorIndex,
      perimeterM: 2 * (wCells + hCells) * cellM,
      storyHeightM,
    };
  });
}

export interface StoryWeight {
  floorIndex: number;
  areaM2: number;
  /** この階の床（固定＋積載）N */
  floorLoadN: number;
  /** この階の外壁（見付）N */
  wallLoadN: number;
  /** この階の内壁（間仕切り）概算 N */
  interiorWallLoadN: number;
  /** 最上階のみの屋根荷重 N */
  roofLoadN: number;
  /** 最上階のみの積雪荷重 N */
  snowLoadN: number;
  /** この階の重量 N（floor+wall+interior+roof+snow） */
  storyLoadN: number;
  /** この階より上の総重量 Wi N（地震力が支える重量） */
  weightAboveN: number;
}

export function computeStoryWeights(
  building: Building,
  conditions: Partial<StructuralConditions> | undefined,
  loads: UnitLoads = DEFAULT_UNIT_LOADS,
): StoryWeight[] {
  const c = normalizeStructuralConditions(conditions);
  const region = regionConditions(c.region);
  const snowPerCm = isHeavySnowRegion(c.region) ? SNOW_UNIT_PER_CM_HEAVY : SNOW_UNIT_PER_CM;
  const geoms = computeStoryGeometries(building.floors, c);
  const top = geoms.length - 1;

  const out: StoryWeight[] = geoms.map((g, i) => {
    const floorLoadN = g.areaM2 * (loads.floor + loads.liveSeismic);
    const wallLoadN = g.perimeterM * g.storyHeightM * loads.exteriorWall;
    const interiorWallLoadN = g.areaM2 * loads.interiorWall;
    const roofLoadN = i === top ? g.areaM2 * loads.roof : 0;
    const snowLoadN = i === top ? g.areaM2 * region.groundSnowCm * snowPerCm : 0;
    const storyLoadN = floorLoadN + wallLoadN + interiorWallLoadN + roofLoadN + snowLoadN;
    return {
      areaM2: g.areaM2,
      floorIndex: i,
      floorLoadN,
      interiorWallLoadN,
      roofLoadN,
      snowLoadN,
      storyLoadN,
      wallLoadN,
      weightAboveN: 0,
    };
  });

  // Wi: 当該階より上の重量を上から累積する。
  let acc = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    acc += out[i].storyLoadN;
    out[i].weightAboveN = acc;
  }
  return out;
}

export interface StorySeismic {
  floorIndex: number;
  /** Wi (N) */
  weightAboveN: number;
  /** Ci = Z × C0（Ai=1 の簡略化） */
  coefficient: number;
  /** 層せん断力 Qi (N) */
  shearN: number;
  /** 必要壁量（倍率換算長さ m）= Qi / 1.96 */
  requiredMultiplierLengthM: number;
}

export function computeSeismicShear(
  building: Building,
  conditions: Partial<StructuralConditions> | undefined,
  loads: UnitLoads = DEFAULT_UNIT_LOADS,
): StorySeismic[] {
  const c = normalizeStructuralConditions(conditions);
  const coefficient = regionConditions(c.region).z * STANDARD_SHEAR_COEFFICIENT;
  return computeStoryWeights(building, c, loads).map((w) => {
    const shearN = coefficient * w.weightAboveN;
    return {
      coefficient,
      floorIndex: w.floorIndex,
      requiredMultiplierLengthM: shearN / 1000 / BASE_STRENGTH_PER_MULTIPLIER,
      shearN,
      weightAboveN: w.weightAboveN,
    };
  });
}
