import type { ItemType } from "./types";

export type ItemCategory = "建具" | "水回り" | "キッチン" | "リビング" | "オフィス";

export interface ItemDef {
  type: ItemType;
  label: string;
  w: number; // マス数（回転前）
  h: number;
  category: ItemCategory;
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
    label: "洗面台(ハーフ)",
    type: "washbasin_half",
    w: 1,
  },
  { category: "水回り", h: 1, label: "洗濯機", type: "washer", w: 1 },
  { category: "キッチン", h: 3, label: "キッチン台", type: "kitchen", w: 1 },
  { category: "キッチン", h: 1, label: "冷蔵庫", type: "fridge", w: 1 },
  { category: "リビング", h: 2, label: "ソファ", type: "sofa", w: 1 },
  { category: "リビング", h: 2, label: "テレビ", type: "tv", w: 1 },
  { category: "リビング", h: 1, label: "棚(1)", type: "shelf1", w: 1 },
  { category: "リビング", h: 2, label: "棚(2)", type: "shelf2", w: 1 },
  {
    category: "リビング",
    h: 2,
    label: "シングルベッド",
    type: "bed_single",
    w: 1,
  },
  {
    category: "リビング",
    h: 2,
    label: "ダブルベッド",
    type: "bed_double",
    w: 2,
  },
  { category: "オフィス", h: 1, label: "椅子", type: "chair", w: 1 },
  { category: "オフィス", h: 2, label: "机", type: "desk", w: 1 },
  { category: "オフィス", h: 2, label: "机(2x2)", type: "desk_large", w: 2 },
];

export const ITEM_DEF_MAP = new Map(ITEM_DEFS.map((d) => [d.type, d]));

export const ITEM_CATEGORIES: ItemCategory[] = [
  "建具",
  "水回り",
  "キッチン",
  "リビング",
  "オフィス",
];
