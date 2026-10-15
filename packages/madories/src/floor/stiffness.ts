import type { ConstructionPreset, FloorPlan } from "../types";
import { MM_PER_CELL } from "../units";
import { computeWallBounds } from "./quadrant-balance";
import { detectShearWallRuns } from "./shear-walls";
import { BASE_STRENGTH_PER_MULTIPLIER, wallMultiplier } from "./structural-conditions";
import type { StorySeismic } from "./loads";
import type { StoryGeometry } from "./loads";

// 剛心・重心・偏心率（令82条の6）と剛性率・層間変形角。
//
// 軸の対応に注意: X方向の力に抵抗するのは **横壁 (h)**、Y方向の力に抵抗するのは
// **縦壁 (v)** である。したがって
//   剛心Y = h壁のY位置を剛性で加重  /  剛心X = v壁のX位置を剛性で加重
// となる（現行の簡易版は逆対応なので、このモジュールで修正する）。
//
// 壁剛性は「壁倍率の定義（変形角1/120で基準耐力）」から K = 1.96·ML·120/h と置く。
// 偏心率・剛性率は剛性の比で決まるため、この定数仮定の影響を受けにくい。
// 層間変形角のみこの仮定に依存するため参考値として扱う。

/** 壁倍率換算長さ ML (m) と階高 h (m) から壁の面内剛性 (kN/m) を求める。 */
export function wallStiffnessKnPerM(multiplierLengthM: number, storyHeightM: number): number {
  if (storyHeightM <= 0) {
    return 0;
  }
  return (multiplierLengthM * BASE_STRENGTH_PER_MULTIPLIER) / (storyHeightM / 120);
}

export interface StoryStiffness {
  floorIndex: number;
  hMultiplierLengthM: number;
  vMultiplierLengthM: number;
  /** X方向（横壁 h）の剛性 kN/m */
  kxKnPerM: number;
  /** Y方向（縦壁 v）の剛性 kN/m */
  kyKnPerM: number;
}

export function computeStoryStiffnesses(
  floors: FloorPlan[],
  construction: ConstructionPreset,
  storyHeightM: number,
  mmPerCell: number = MM_PER_CELL,
): StoryStiffness[] {
  const multiplier = wallMultiplier(construction, "solid");
  return floors.map((floor, floorIndex) => {
    let hLen = 0;
    let vLen = 0;
    for (const run of detectShearWallRuns(floor, mmPerCell)) {
      const ml = multiplier * (run.length / 1000);
      if (run.kind === "h") {
        hLen += ml;
      } else {
        vLen += ml;
      }
    }
    return {
      floorIndex,
      hMultiplierLengthM: hLen,
      kxKnPerM: wallStiffnessKnPerM(hLen, storyHeightM),
      kyKnPerM: wallStiffnessKnPerM(vLen, storyHeightM),
      vMultiplierLengthM: vLen,
    };
  });
}

export interface Eccentricity {
  /** 重心 (mm) */
  gxMm: number;
  gyMm: number;
  /** 剛心 (mm) */
  cxMm: number;
  cyMm: number;
  /** 弾力半径 (mm) */
  radiusXmm: number;
  radiusYmm: number;
  ex: number;
  ey: number;
  /** Max(ex, ey) <= 0.3 */
  ok: boolean;
}

/** 質量重心 (cell 座標)。塗られた床を等密度、無ければ外接矩形中心。 */
function massCentroid(floor: FloorPlan): { x: number; y: number } | null {
  const b = computeWallBounds(floor);
  if (!b) {
    return null;
  }
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (floor.cells[y * floor.width + x].floorType === null) {
        continue;
      }
      n++;
      sx += x + 0.5;
      sy += y + 0.5;
    }
  }
  if (n > 0) {
    return { x: sx / n, y: sy / n };
  }
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export function computeEccentricity(
  floor: FloorPlan,
  construction: ConstructionPreset = "post_and_beam_panel",
  mmPerCell: number = MM_PER_CELL,
): Eccentricity | null {
  const mass = massCentroid(floor);
  if (!mass) {
    return null;
  }
  const multiplier = wallMultiplier(construction, "solid");
  let hK = 0;
  let hKy = 0;
  let vK = 0;
  let vKx = 0;
  for (const run of detectShearWallRuns(floor, mmPerCell)) {
    const k = multiplier * (run.length / 1000);
    if (run.kind === "h") {
      hK += k;
      hKy += k * run.y;
    } else {
      vK += k;
      vKx += k * run.x;
    }
  }
  if (hK <= 0 || vK <= 0) {
    return null;
  }
  const cx = vKx / vK;
  const cy = hKy / hK;
  let varX = 0;
  let varY = 0;
  for (const run of detectShearWallRuns(floor, mmPerCell)) {
    const k = multiplier * (run.length / 1000);
    if (run.kind === "h") {
      varY += k * (run.y - cy) ** 2;
    } else {
      varX += k * (run.x - cx) ** 2;
    }
  }
  const radiusX = Math.sqrt(varX / vK);
  const radiusY = Math.sqrt(varY / hK);
  const ex = radiusX > 0 ? Math.abs(mass.x - cx) / radiusX : 0;
  const ey = radiusY > 0 ? Math.abs(mass.y - cy) / radiusY : 0;
  const mm = mmPerCell;
  return {
    cxMm: cx * mm,
    cyMm: cy * mm,
    ex,
    ey,
    gxMm: mass.x * mm,
    gyMm: mass.y * mm,
    ok: Math.max(ex, ey) <= 0.3,
    radiusXmm: radiusX * mm,
    radiusYmm: radiusY * mm,
  };
}

export interface RigidityRatio {
  floorIndex: number;
  rsH: number;
  rsV: number;
  okH: boolean;
  okV: boolean;
}

/** 剛性率 Rs = 層剛性 / 平均層剛性（令82条の6、0.6以上）。 */
export function computeRigidityRatios(stiffnesses: StoryStiffness[]): RigidityRatio[] {
  if (stiffnesses.length === 0) {
    return [];
  }
  const meanH = stiffnesses.reduce((a, s) => a + s.kxKnPerM, 0) / stiffnesses.length;
  const meanV = stiffnesses.reduce((a, s) => a + s.kyKnPerM, 0) / stiffnesses.length;
  return stiffnesses.map((s) => {
    const rsH = meanH > 0 ? s.kxKnPerM / meanH : 0;
    const rsV = meanV > 0 ? s.kyKnPerM / meanV : 0;
    return { floorIndex: s.floorIndex, okH: rsH >= 0.6, okV: rsV >= 0.6, rsH, rsV };
  });
}

export interface StoryDrift {
  floorIndex: number;
  driftH: number;
  driftV: number;
  okH: boolean;
  okV: boolean;
}

const DRIFT_LIMIT = 1 / 200;

/**
 * 層間変形角の比 δ/h を「1/n」表記にする。0・NaN・Infinity や極端値でも
 * 壊れた文字列（1/0 など）を出さない。
 */
export function formatDriftRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return "—";
  }
  const inverse = 1 / ratio;
  if (inverse < 1) {
    return "1/1未満";
  }
  if (inverse > 9999) {
    return "1/9999超";
  }
  return `1/${Math.round(inverse)}`;
}

/** 層間変形角 δ/h = Q/(K·h)（令82条の6、1/200以下）。剛性の仮定に依存する参考値。 */
export function computeStoryDrifts(
  seismic: StorySeismic[],
  stiffnesses: StoryStiffness[],
  geometries: StoryGeometry[],
): StoryDrift[] {
  return stiffnesses.map((s) => {
    const q = seismic.find((x) => x.floorIndex === s.floorIndex)?.shearN ?? 0;
    const h = geometries.find((g) => g.floorIndex === s.floorIndex)?.storyHeightM ?? 0;
    const dh = s.kxKnPerM > 0 && h > 0 ? q / 1000 / s.kxKnPerM / h : 0;
    const dv = s.kyKnPerM > 0 && h > 0 ? q / 1000 / s.kyKnPerM / h : 0;
    return {
      driftH: dh,
      driftV: dv,
      floorIndex: s.floorIndex,
      okH: dh > 0 && dh <= DRIFT_LIMIT,
      okV: dv > 0 && dv <= DRIFT_LIMIT,
    };
  });
}
