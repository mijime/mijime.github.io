import type { ItemType, WallType } from "./types";

export type ItemCategory = "建具" | "水回り" | "キッチン" | "リビング" | "寝室";

export interface ItemDef {
  type: ItemType;
  label: string;
  w: number; // マス数（回転前）
  h: number;
  category: ItemCategory;
  storageScore?: number;
}

export const ITEM_DEFS: ItemDef[] = [
  { category: "建具", h: 1, label: "開き戸", type: "door", w: 1 },
  { category: "建具", h: 1, label: "引き戸", type: "door_slide", w: 1 },
  { category: "建具", h: 2, label: "階段", type: "stairs", w: 1 },
  { category: "水回り", h: 1, label: "トイレ", type: "toilet", w: 1 },
  { category: "水回り", h: 2, label: "浴槽", type: "bathtub", w: 1 },
  { category: "水回り", h: 1, label: "洗面台", type: "washbasin", w: 1 },
  {
    category: "水回り",
    h: 1,
    label: "洗面台(小)",
    type: "washbasin_half",
    w: 1,
  },
  { category: "水回り", h: 2, label: "洗面台(大)", type: "washbasin_large", w: 1 },
  { category: "水回り", h: 1, label: "洗濯機", type: "washer", w: 1 },
  { category: "キッチン", h: 2, label: "キッチン台(小)", type: "kitchen_small", w: 1 },
  { category: "キッチン", h: 3, label: "キッチン台", type: "kitchen", w: 1 },
  { category: "キッチン", h: 1, label: "冷蔵庫", type: "fridge", w: 1 },
  { category: "リビング", h: 2, label: "ソファ", type: "sofa", w: 1 },
  { category: "リビング", h: 2, label: "テレビ", type: "tv", w: 1 },
  { category: "リビング", h: 1, label: "棚", storageScore: 1, type: "shelf1", w: 1 },
  { category: "リビング", h: 2, label: "棚(2段)", storageScore: 2, type: "shelf2", w: 1 },
  {
    category: "寝室",
    h: 2,
    label: "ベッド(シングル)",
    type: "bed_single",
    w: 1,
  },
  {
    category: "寝室",
    h: 2,
    label: "ベッド(ダブル)",
    type: "bed_double",
    w: 2,
  },
  { category: "リビング", h: 1, label: "椅子", type: "chair", w: 1 },
  { category: "リビング", h: 1, label: "机(小)", type: "desk_small", w: 1 },
  { category: "リビング", h: 2, label: "机(大)", type: "desk", w: 1 },
];

export const ITEM_DEF_MAP = new Map(ITEM_DEFS.map((d) => [d.type, d]));

// Maps variant types to their representative type for legend grouping
export const ITEM_GROUP_REPRESENTATIVE = new Map<ItemType, ItemType>([
  ["washbasin_half", "washbasin"],
  ["washbasin_large", "washbasin"],
  ["kitchen_small", "kitchen"],
  ["shelf2", "shelf1"],
  ["desk_small", "desk"],
  ["bed_double", "bed_single"],
]);

export const ITEM_LEGEND_LABEL = new Map<ItemType, string>([
  ["washbasin", "洗面台"],
  ["kitchen", "キッチン台"],
  ["shelf1", "棚"],
  ["desk", "机"],
  ["bed_single", "ベッド"],
]);

export const WALL_LEGEND_LABEL: Partial<Record<WallType, string>> = {
  solid: "壁",
  solid_thin: "開口部",
  window_center: "半窓",
  window_full: "全窓",
};

export const ITEM_CATEGORIES: ItemCategory[] = ["建具", "水回り", "キッチン", "リビング", "寝室"];
