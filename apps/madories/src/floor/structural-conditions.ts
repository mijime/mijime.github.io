import type { ConstructionPreset, StructuralConditions, WallType } from "../types";

// 許容応力度計算の前提条件をまとめる DOM 非依存モジュール。
//
// 壁倍率は告示の木造壁倍率、基準耐力は「壁倍率1あたり 1.96 kN/m」を用いる。
// 地震地域係数 Z・垂直積雪量・基準風速 V0 は本来 市町村（特定行政庁の施行細則・
// 大臣告示）単位で定まる。ここに置くのは**都道府県の低地代表値**であり、
// 実設計では必ず一次資料（施行細則・告示）で確認する必要がある。

export interface ConstructionPresetInfo {
  label: string;
  /**
   * 壁倍率。耐力壁として算入する WallType のみ持ち、開口（window_*）や
   * 扉のある薄壁（solid_thin）は含めない（＝倍率0）。
   */
  multipliers: Partial<Record<WallType, number>>;
}

/** 壁倍率1あたりの基準耐力 (kN/m)（告示の木造壁倍率に対応する値）。 */
export const BASE_STRENGTH_PER_MULTIPLIER = 1.96;

export const CONSTRUCTION_PRESETS: Record<ConstructionPreset, ConstructionPresetInfo> = {
  post_and_beam_brace: {
    label: "在来軸組・筋かい",
    multipliers: { solid: 2 },
  },
  post_and_beam_panel: {
    label: "在来軸組・構造用合板",
    multipliers: { solid: 2.5 },
  },
  wood_frame: {
    label: "枠組壁工法・構造用合板",
    multipliers: { solid: 2.5 },
  },
};

export interface RegionConditions {
  /** 地震地域係数 Z（昭55建告第1793号） */
  z: number;
  /** 垂直積雪量 (cm) の代表値（令86条・各施行細則） */
  groundSnowCm: number;
  /** 基準風速 V0 (m/s) の代表値（平12建告第1454号） */
  referenceWindSpeed: number;
}

export const DEFAULT_REGION = "東京都";

/** 都道府県 → 代表値。低地の値を採り、多雪区域は 100cm 以上で判定する。 */
export const REGIONS: Record<string, RegionConditions> = {
  北海道: { groundSnowCm: 90, referenceWindSpeed: 34, z: 1 },
  青森県: { groundSnowCm: 110, referenceWindSpeed: 34, z: 1 },
  岩手県: { groundSnowCm: 80, referenceWindSpeed: 32, z: 1 },
  宮城県: { groundSnowCm: 40, referenceWindSpeed: 32, z: 1 },
  秋田県: { groundSnowCm: 100, referenceWindSpeed: 32, z: 1 },
  山形県: { groundSnowCm: 100, referenceWindSpeed: 32, z: 1 },
  福島県: { groundSnowCm: 50, referenceWindSpeed: 32, z: 1 },
  茨城県: { groundSnowCm: 30, referenceWindSpeed: 32, z: 1 },
  栃木県: { groundSnowCm: 30, referenceWindSpeed: 30, z: 1 },
  群馬県: { groundSnowCm: 30, referenceWindSpeed: 30, z: 1 },
  埼玉県: { groundSnowCm: 30, referenceWindSpeed: 30, z: 1 },
  千葉県: { groundSnowCm: 30, referenceWindSpeed: 34, z: 1 },
  東京都: { groundSnowCm: 30, referenceWindSpeed: 34, z: 1 },
  神奈川県: { groundSnowCm: 30, referenceWindSpeed: 34, z: 1 },
  新潟県: { groundSnowCm: 100, referenceWindSpeed: 32, z: 1 },
  富山県: { groundSnowCm: 100, referenceWindSpeed: 30, z: 1 },
  石川県: { groundSnowCm: 80, referenceWindSpeed: 30, z: 1 },
  福井県: { groundSnowCm: 100, referenceWindSpeed: 32, z: 1 },
  山梨県: { groundSnowCm: 30, referenceWindSpeed: 30, z: 1 },
  長野県: { groundSnowCm: 60, referenceWindSpeed: 30, z: 1 },
  岐阜県: { groundSnowCm: 50, referenceWindSpeed: 30, z: 1 },
  静岡県: { groundSnowCm: 0, referenceWindSpeed: 34, z: 1 },
  愛知県: { groundSnowCm: 15, referenceWindSpeed: 32, z: 1 },
  三重県: { groundSnowCm: 15, referenceWindSpeed: 32, z: 1 },
  滋賀県: { groundSnowCm: 50, referenceWindSpeed: 30, z: 1 },
  京都府: { groundSnowCm: 30, referenceWindSpeed: 32, z: 1 },
  大阪府: { groundSnowCm: 0, referenceWindSpeed: 32, z: 1 },
  兵庫県: { groundSnowCm: 30, referenceWindSpeed: 32, z: 1 },
  奈良県: { groundSnowCm: 30, referenceWindSpeed: 30, z: 1 },
  和歌山県: { groundSnowCm: 0, referenceWindSpeed: 34, z: 1 },
  鳥取県: { groundSnowCm: 50, referenceWindSpeed: 32, z: 1 },
  島根県: { groundSnowCm: 60, referenceWindSpeed: 32, z: 1 },
  岡山県: { groundSnowCm: 0, referenceWindSpeed: 30, z: 1 },
  広島県: { groundSnowCm: 0, referenceWindSpeed: 32, z: 1 },
  山口県: { groundSnowCm: 0, referenceWindSpeed: 32, z: 1 },
  徳島県: { groundSnowCm: 0, referenceWindSpeed: 34, z: 1 },
  香川県: { groundSnowCm: 30, referenceWindSpeed: 32, z: 1 },
  愛媛県: { groundSnowCm: 0, referenceWindSpeed: 34, z: 1 },
  高知県: { groundSnowCm: 0, referenceWindSpeed: 36, z: 1 },
  福岡県: { groundSnowCm: 0, referenceWindSpeed: 32, z: 1 },
  佐賀県: { groundSnowCm: 0, referenceWindSpeed: 32, z: 1 },
  長崎県: { groundSnowCm: 0, referenceWindSpeed: 34, z: 1 },
  熊本県: { groundSnowCm: 0, referenceWindSpeed: 32, z: 1 },
  大分県: { groundSnowCm: 0, referenceWindSpeed: 34, z: 1 },
  宮崎県: { groundSnowCm: 0, referenceWindSpeed: 34, z: 1 },
  鹿児島県: { groundSnowCm: 0, referenceWindSpeed: 36, z: 1 },
  沖縄県: { groundSnowCm: 0, referenceWindSpeed: 38, z: 0.7 },
};

/** 都道府県名の一覧（UI のセレクト用、定義順）。 */
export const REGION_NAMES = Object.keys(REGIONS);

export function regionConditions(region: string): RegionConditions {
  return REGIONS[region] ?? REGIONS[DEFAULT_REGION];
}

/** 多雪区域（垂直積雪量 1m 以上、または積雪初終間日数30日以上）。 */
export function isHeavySnowRegion(region: string): boolean {
  return regionConditions(region).groundSnowCm >= 100;
}

export const DEFAULT_STRUCTURAL_CONDITIONS: StructuralConditions = {
  construction: "post_and_beam_panel",
  region: DEFAULT_REGION,
  storyHeightMm: 2800,
};

/** 未設定・欠落を既定値で補完する（保存データの後方互換）。 */
export function normalizeStructuralConditions(
  conditions: Partial<StructuralConditions> | undefined,
): StructuralConditions {
  return { ...DEFAULT_STRUCTURAL_CONDITIONS, ...conditions };
}

/** 構法プリセットにおける壁種別の壁倍率（耐力壁でなければ 0）。 */
export function wallMultiplier(construction: ConstructionPreset, type: WallType): number {
  return CONSTRUCTION_PRESETS[construction].multipliers[type] ?? 0;
}
