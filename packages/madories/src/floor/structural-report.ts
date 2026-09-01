import type { FloorPlan } from "../types";
import {
  computeInterFloorWallBalance,
  computeWallQuantity,
  type InterFloorWallBalance,
  type WallQuantity,
} from "./wall-quantity";
import { computeQuadrantBalance, type FloorBalance } from "./quadrant-balance";
import {
  computeBalanceRatio,
  computeEccentricity,
  computePerimeterContinuity,
  type BalanceMetrics,
  type EccentricityMetrics,
  type PerimeterMetric,
} from "./structure-metrics";
import { computeFloorSupport, type FloorSupport } from "./floor-support";
import { detectLoadPathBreaks, type LoadPathBreak } from "./shear-walls";

/**
 * One-stop structural indicator bundle for a floor (目安). The diagnostic panel
 * and the PNG export both build their readout from this single function, so the
 * per-metric caculation stays in one place.
 */
export interface StructuralReport {
  /** Index of this floor in `floors` (bottom-up), or -1 if not found */
  floorIndex: number;
  wallQuantity: WallQuantity;
  quadrant: FloorBalance;
  balanceRatio: BalanceMetrics;
  eccentricity: EccentricityMetrics | null;
  perimeter: PerimeterMetric | null;
  /** 上下壁量: this floor vs the one above (undefined when it is the top/only) */
  interFloor: InterFloorWallBalance | undefined;
  /** 床支持: this floor's deck supported by the floor below (undefined when ground) */
  support: FloorSupport | undefined;
  /** 通りズレ whose demand is on this floor (wants support from the floor above) */
  breaksHere: LoadPathBreak[];
  /** 通りズレ whose demand is on the floor above (wants support on this floor) */
  breaksBelow: LoadPathBreak[];
}

export function computeStructuralReport(floor: FloorPlan, floors: FloorPlan[]): StructuralReport {
  const floorIndex = floors.findIndex((f) => f.id === floor.id);
  const breaks = detectLoadPathBreaks(floors);
  const breaksHere = floorIndex !== -1 ? breaks.filter((b) => b.floorIndex === floorIndex + 1) : [];
  const breaksBelow = floorIndex !== -1 ? breaks.filter((b) => b.floorIndex === floorIndex) : [];
  return {
    balanceRatio: computeBalanceRatio(floor),
    breaksBelow,
    breaksHere,
    eccentricity: computeEccentricity(floor),
    floorIndex,
    interFloor: computeInterFloorWallBalance(floors).find((b) => b.lowerIndex === floorIndex),
    perimeter: computePerimeterContinuity(floor),
    quadrant: computeQuadrantBalance(floor),
    support: computeFloorSupport(floors).find((s) => s.floorIndex === floorIndex),
    wallQuantity: computeWallQuantity(floor),
  };
}
