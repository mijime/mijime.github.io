import type { Building, StructuralConditions } from "../types";
import { computeFloorSupport, type FloorSupport } from "./floor-support";
import {
  computeSeismicShear,
  computeStoryGeometries,
  computeStoryWeights,
  type StoryGeometry,
  type StorySeismic,
  type StoryWeight,
} from "./loads";
import { computeQuadrantBalance, type FloorBalance } from "./quadrant-balance";
import { detectLoadPathBreaks, type LoadPathBreak } from "./shear-walls";
import {
  computeEccentricity,
  computeRigidityRatios,
  computeStoryDrifts,
  computeStoryStiffnesses,
  type Eccentricity,
  type RigidityRatio,
  type StoryDrift,
  type StoryStiffness,
} from "./stiffness";
import {
  normalizeStructuralConditions,
  regionConditions,
  type RegionConditions,
} from "./structural-conditions";
import { computeWallStrength, type WallStrength } from "./wall-strength";
import { computeWallDemands, type WallDemand } from "./wall-demand";

// 許容応力度計算（簡易）のレポート。壁量（地震力に対する必要壁量）・偏心率・
// 剛性率・層間変形角を軸に、四分割・床支持・通りズレを参考値として同梱する。
// 診断パネルと PNG 出力はこの1関数を唯一の出所とする。

export interface FloorStress {
  floorIndex: number;
  geometry: StoryGeometry;
  weight: StoryWeight;
  seismic: StorySeismic;
  strength: WallStrength;
  /** 層剛性（X/Y の kN/m）。剛性率・変形角の根拠表示に使う */
  stiffness: StoryStiffness;
  /** 必要壁量（倍率換算長さ m、X/Y 共通） */
  requiredMultiplierLengthM: number;
  /** 倍率換算長さ 保有 >= 必要 */
  wallOkH: boolean;
  wallOkV: boolean;
  /** 剛心・重心・偏心率（壁倍率は比で消えるため構法非依存） */
  eccentricity: Eccentricity | null;
  /** 壁ごとの負担せん断と検定比（ねじれ込み） */
  wallDemands: WallDemand[];
  rigidity: RigidityRatio | undefined;
  drift: StoryDrift | undefined;
  // ---- 参考指標 ----
  quadrant: FloorBalance;
  support: FloorSupport | undefined;
  breaksHere: LoadPathBreak[];
  breaksBelow: LoadPathBreak[];
}

export interface StructuralReport {
  conditions: StructuralConditions;
  region: RegionConditions;
  floors: FloorStress[];
}

export function computeStructuralReport(building: Building): StructuralReport {
  const conditions = normalizeStructuralConditions(building.structural);
  const region = regionConditions(conditions.region);
  const storyHeightM = conditions.storyHeightMm / 1000;

  const geometries = computeStoryGeometries(building.floors, conditions);
  const weights = computeStoryWeights(building, conditions);
  const seismic = computeSeismicShear(building, conditions);
  const stiffnesses = computeStoryStiffnesses(
    building.floors,
    conditions.construction,
    storyHeightM,
  );
  const rigidity = computeRigidityRatios(stiffnesses);
  const drifts = computeStoryDrifts(seismic, stiffnesses, geometries);
  const supports = computeFloorSupport(building.floors);
  const breaks = detectLoadPathBreaks(building.floors);

  const floors: FloorStress[] = building.floors.map((floor, i) => {
    const strength = computeWallStrength(floor, conditions.construction);
    const eccentricity = computeEccentricity(floor);
    const required = seismic[i]?.requiredMultiplierLengthM ?? 0;
    return {
      breaksBelow: breaks.filter((b) => b.floorIndex === i),
      breaksHere: breaks.filter((b) => b.floorIndex === i + 1),
      drift: drifts.find((d) => d.floorIndex === i),
      eccentricity,
      floorIndex: i,
      geometry: geometries[i],
      quadrant: computeQuadrantBalance(floor),
      requiredMultiplierLengthM: required,
      rigidity: rigidity.find((r) => r.floorIndex === i),
      seismic: seismic[i],
      stiffness: stiffnesses[i],
      strength,
      support: supports.find((s) => s.floorIndex === i),
      wallDemands: computeWallDemands(
        floor,
        seismic[i]?.shearN ?? 0,
        eccentricity,
        conditions.construction,
      ),
      wallOkH: required > 0 && strength.hMultiplierLengthM >= required,
      wallOkV: required > 0 && strength.vMultiplierLengthM >= required,
      weight: weights[i],
    };
  });

  return { conditions, floors, region };
}
