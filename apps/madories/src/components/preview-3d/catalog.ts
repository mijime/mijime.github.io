import type { ItemType } from "../../types";
import type { MaterialKey } from "./config";

export interface Part {
  size: [number, number, number]; // [w, h, d] cm
  offset: [number, number, number]; // [x, 底面高さ, z] cm、footprint中心基準
  materialKey: MaterialKey;
}

export interface ItemSpec {
  footprint: { w: number; d: number }; // Cm、rotation=0時(w=x方向, d=z方向)
  parts: Part[];
  /** 2Dアイコンがセル端に接して描かれる家具(椅子/棚/洗面台/テレビ等)。
   *  背(=幅広面)がセル端に接するよう箱を寄せる。壁の検出はしない。未指定はセル中央配置。
   *  値は rotation=0 時の「背」の向きベクトル(x,z)。正規化不要、向きのみ使う。
   *  example: 背を西(-x)に置く→ {x:-1, z:0}、背を南(+z)に置く→ {x:0, z:1} */
  backDir?: { x: number; z: number };
}

function stairsParts(): Part[] {
  // 1x2セル(91x182cm)に7段の直階段。2マスのスペンで2F(240cm)へ上がる実物だが、
  // プレビューは単フロア基準なので高さを半分(120cm)に抑えて表現する
  const stepCount = 7;
  const width = 85;
  const depthTotal = 182;
  const stepDepth = depthTotal / stepCount;
  const rise = 120 / stepCount;
  const parts: Part[] = [];
  for (let i = 0; i < stepCount; i++) {
    parts.push({
      materialKey: "wood",
      offset: [0, 0, -depthTotal / 2 + stepDepth * (i + 0.5)],
      size: [width, rise * (i + 1), stepDepth],
    });
  }
  return parts;
}

export const ITEM_CATALOG: Record<ItemType, ItemSpec> = {
  // 2Dアイコンの閉扉位置(rotation=0で左端)に合わせ、セル左端の壁面上に置く
  door: {
    footprint: { d: 91, w: 91 },
    parts: [{ materialKey: "wood", offset: [-42.5, 0, 0], size: [6, 200, 80] }],
  },
  // 引き戸の2Dアイコンはrotation=0で上端に水平なので、セル上端に置く
  door_slide: {
    footprint: { d: 91, w: 91 },
    parts: [{ materialKey: "wood_light", offset: [0, 0, -43.5], size: [85, 200, 4] }],
  },
  stairs: { footprint: { d: 182, w: 91 }, parts: stairsParts() },
  toilet: {
    footprint: { d: 80, w: 45 },
    parts: [
      { materialKey: "ceramic", offset: [0, 20, 8], size: [38, 20, 55] },
      { materialKey: "ceramic", offset: [0, 40, -30], size: [42, 45, 18] },
    ],
  },
  bathtub: {
    footprint: { d: 160, w: 78 },
    parts: [{ materialKey: "ceramic", offset: [0, 0, 0], size: [75, 55, 160] }],
  },
  washbasin: {
    footprint: { d: 60, w: 65 },
    parts: [
      { materialKey: "ceramic", offset: [0, 0, 3], size: [60, 72, 54] },
      { materialKey: "glass", offset: [0, 110, -28], size: [55, 80, 3] },
    ],
    backDir: { x: 0, z: -1 }, // 壁付け洗面台: 北(-z)を背に
  },
  washbasin_half: {
    footprint: { d: 45, w: 50 },
    parts: [{ materialKey: "ceramic", offset: [0, 0, 0], size: [45, 72, 40] }],
    backDir: { x: 0, z: -1 }, // 壁付け洗面台: 北(-z)を背に
  },
  washbasin_large: {
    footprint: { d: 165, w: 65 },
    parts: [
      { materialKey: "wood_light", offset: [0, 0, 0], size: [60, 72, 160] },
      { materialKey: "ceramic", offset: [0, 72, 20], size: [55, 10, 55] },
      { materialKey: "glass", offset: [-28, 100, 0], size: [3, 90, 150] },
    ],
  },
  washer: {
    footprint: { d: 65, w: 65 },
    parts: [{ materialKey: "appliance", offset: [0, 0, 0], size: [60, 100, 60] }],
  },
  kitchen_small: {
    footprint: { d: 170, w: 70 },
    parts: [{ materialKey: "appliance", offset: [0, 0, 0], size: [65, 85, 165] }],
  },
  kitchen: {
    footprint: { d: 260, w: 70 },
    parts: [{ materialKey: "appliance", offset: [0, 0, 0], size: [65, 85, 255] }],
  },
  fridge: {
    footprint: { d: 72, w: 70 },
    parts: [{ materialKey: "metal", offset: [0, 0, 0], size: [68, 180, 70] }],
  },
  sofa: {
    footprint: { d: 165, w: 85 },
    parts: [
      { materialKey: "fabric", offset: [8, 0, 0], size: [60, 40, 160] },
      { materialKey: "fabric_dark", offset: [-30, 0, 0], size: [22, 75, 160] },
      { materialKey: "fabric_dark", offset: [8, 40, -72], size: [60, 20, 16] },
      { materialKey: "fabric_dark", offset: [8, 40, 72], size: [60, 20, 16] },
    ],
  },
  tv: {
    footprint: { d: 172, w: 45 },
    parts: [
      { materialKey: "wood", offset: [0, 0, 0], size: [42, 40, 170] },
      { materialKey: "screen", offset: [0, 45, 0], size: [8, 85, 150] },
    ],
    backDir: { x: -1, z: 0 }, // 2Dアイコンは左端: 西(-x)を背に
  },
  shelf1: {
    footprint: { d: 88, w: 42 },
    parts: [{ materialKey: "wood", offset: [0, 0, 0], size: [40, 180, 85] }],
    backDir: { x: -1, z: 0 }, // 2Dアイコンは左端(幅広面): 西(-x)を背に
  },
  shelf2: {
    footprint: { d: 178, w: 42 },
    parts: [{ materialKey: "wood", offset: [0, 0, 0], size: [40, 180, 176] }],
    backDir: { x: -1, z: 0 }, // 2Dアイコンは左端(幅広面): 西(-x)を背に
  },
  bed_single: {
    footprint: { d: 196, w: 98 },
    parts: [
      { materialKey: "wood", offset: [0, 0, 0], size: [97, 25, 195] },
      { materialKey: "mattress", offset: [0, 25, 0], size: [90, 18, 188] },
      { materialKey: "ceramic", offset: [0, 43, -70], size: [50, 8, 35] },
    ],
  },
  bed_double: {
    footprint: { d: 196, w: 145 },
    parts: [
      { materialKey: "wood", offset: [0, 0, 0], size: [143, 25, 195] },
      { materialKey: "mattress", offset: [0, 25, 0], size: [136, 18, 188] },
      { materialKey: "ceramic", offset: [-32, 43, -70], size: [50, 8, 35] },
      { materialKey: "ceramic", offset: [32, 43, -70], size: [50, 8, 35] },
    ],
  },
  desk: {
    footprint: { d: 125, w: 65 },
    parts: [
      { materialKey: "wood_light", offset: [0, 68, 0], size: [60, 4, 120] },
      { materialKey: "wood", offset: [-25, 0, -55], size: [5, 68, 5] },
      { materialKey: "wood", offset: [-25, 0, 55], size: [5, 68, 5] },
      { materialKey: "wood", offset: [25, 0, -55], size: [5, 68, 5] },
      { materialKey: "wood", offset: [25, 0, 55], size: [5, 68, 5] },
    ],
  },
  desk_small: {
    footprint: { d: 50, w: 85 },
    parts: [{ materialKey: "wood_light", offset: [0, 0, 0], size: [80, 70, 45] }],
  },
  chair: {
    footprint: { d: 48, w: 48 },
    parts: [
      { materialKey: "wood", offset: [0, 0, 0], size: [8, 42, 8] },
      { materialKey: "fabric", offset: [0, 42, 0], size: [44, 8, 44] },
      { materialKey: "fabric_dark", offset: [0, 50, 20], size: [44, 45, 6] },
    ],
  },
  car: {
    footprint: { d: 430, w: 175 },
    parts: [
      { materialKey: "car_body", offset: [0, 20, 0], size: [170, 100, 425] },
      { materialKey: "glass", offset: [0, 120, 20], size: [160, 55, 190] },
    ],
  },
};

const FALLBACK_SPEC: ItemSpec = {
  footprint: { d: 80, w: 80 },
  parts: [{ materialKey: "fallback", offset: [0, 0, 0], size: [80, 60, 80] }],
};

export function getItemSpec(type: ItemType): ItemSpec {
  return ITEM_CATALOG[type] ?? FALLBACK_SPEC;
}
