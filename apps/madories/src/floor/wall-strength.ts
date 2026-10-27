import type { ConstructionPreset, FloorPlan } from "../types";
import { MM_PER_CELL } from "../units";
import { detectShearWallRuns } from "./shear-walls";
import { BASE_STRENGTH_PER_MULTIPLIER, wallMultiplier } from "./structural-conditions";

// 耐力壁の「倍率換算長さ」= Σ(壁倍率 × 壁長 m)。必要壁量と直接比較できる形に
// そろえるため、耐力 (kN) ではなく倍率換算長さ (m) を一次量として返す。
// 耐力 [kN] = 倍率換算長さ [m] × BASE_STRENGTH_PER_MULTIPLIER [kN/m]。

export interface WallPanel {
  /** H: X方向の力に抵抗（横壁） / v: Y方向の力に抵抗（縦壁） */
  kind: "h" | "v";
  x: number;
  y: number;
  cells: number;
  lengthM: number;
  multiplier: number;
  /** 倍率換算長さ (m) = 壁倍率 × 壁長 */
  multiplierLengthM: number;
}

export interface WallStrength {
  /** X方向（h壁）の倍率換算長さ合計 (m) */
  hMultiplierLengthM: number;
  /** Y方向（v壁）の倍率換算長さ合計 (m) */
  vMultiplierLengthM: number;
  /** 採用した壁倍率（構法プリセットの solid 倍率） */
  multiplier: number;
  panels: WallPanel[];
}

/**
 * 耐力壁を検出し、構法プリセットの壁倍率を掛けて方向別に集計する。
 * 現状のモデルでは耐力壁は `solid` のみ（開口はランを分断する）。
 */
export function computeWallStrength(
  floor: FloorPlan,
  construction: ConstructionPreset,
  mmPerCell: number = MM_PER_CELL,
): WallStrength {
  const panels: WallPanel[] = [];
  const multiplier = wallMultiplier(construction, "solid");
  let h = 0;
  let v = 0;
  for (const run of detectShearWallRuns(floor, mmPerCell)) {
    if (multiplier <= 0) {
      continue;
    }
    const lengthM = run.length / 1000;
    const multiplierLengthM = multiplier * lengthM;
    if (run.kind === "h") {
      h += multiplierLengthM;
    } else {
      v += multiplierLengthM;
    }
    panels.push({
      cells: run.cells,
      kind: run.kind,
      lengthM,
      multiplier,
      multiplierLengthM,
      x: run.x,
      y: run.y,
    });
  }
  return { hMultiplierLengthM: h, multiplier, panels, vMultiplierLengthM: v };
}

/** 倍率換算長さ (m) → 耐力 (kN)。 */
export function multiplierLengthToStrengthKn(multiplierLengthM: number): number {
  return multiplierLengthM * BASE_STRENGTH_PER_MULTIPLIER;
}
