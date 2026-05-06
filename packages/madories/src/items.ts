import type { ItemType, WallType } from "./types";
import { drawBathtub } from "./draw/icons/bathtub";
import { drawBed } from "./draw/icons/bed";
import { drawChair } from "./draw/icons/chair";
import { drawDesk } from "./draw/icons/desk";
import { drawDoor } from "./draw/icons/door";
import { drawDoorSlide } from "./draw/icons/door_slide";
import { drawFridge } from "./draw/icons/fridge";
import { drawKitchen } from "./draw/icons/kitchen";
import { drawShelf } from "./draw/icons/shelf";
import { drawSofa } from "./draw/icons/sofa";
import { drawStairs } from "./draw/icons/stairs";
import { drawToilet } from "./draw/icons/toilet";
import { drawTv } from "./draw/icons/tv";
import { drawWashbasin } from "./draw/icons/washbasin";
import { drawWashbasinHalf } from "./draw/icons/washbasin-half";
import { drawWasher } from "./draw/icons/washer";

export type ItemCategory = "建具" | "水回り" | "キッチン" | "リビング" | "寝室";

export interface MeshPart {
  geometry: [number, number, number]; // [w, h, d]
  position: [number, number, number]; // [x, y, z]
  color?: { light: string; dark: string };
}

type DrawFn = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode?: boolean,
) => void;

export interface ItemDef {
  type: ItemType;
  label: string;
  w: number;
  h: number;
  category: ItemCategory;
  storageScore?: number;
  color: { light: string; dark: string };
  heightFactor?: number;
  depthFactor?: number;
  parts?: (cellSize: number, width: number, height: number, depth: number) => MeshPart[];
  icon: DrawFn;
}

export const ITEM_DEFS: ItemDef[] = [
  // === 建具 ===
  { category: "建具", h: 1, label: "開き戸", type: "door", w: 1,
    color: { light: "#8b4513", dark: "#5c2e0c" }, icon: drawDoor },
  { category: "建具", h: 1, label: "引き戸", type: "door_slide", w: 1,
    color: { light: "#8b4513", dark: "#5c2e0c" }, icon: drawDoorSlide },
  { category: "建具", h: 2, label: "階段", type: "stairs", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" },
    parts: (cellSize: number) => {
      const def = { w: 1, h: 2 };
      const stepCount = 6;
      const totalH = cellSize * 1.5;
      const stepW = cellSize * def.w;
      const stepD = (cellSize * def.h) / stepCount;
      const halfSpan = (cellSize * def.h) / 2;
      const stepH = totalH / stepCount;
      return Array.from({ length: stepCount }, (_, i) => ({
        geometry: [stepW * 0.95, stepH * 0.95, stepD * 0.95] as [number, number, number],
        position: [0, stepH * (i + 0.5), -halfSpan + stepD / 2 + i * stepD] as [number, number, number],
      }));
    },
    icon: drawStairs },

  // === 水回り ===
  { category: "水回り", h: 1, label: "トイレ", type: "toilet", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" }, icon: drawToilet },
  { category: "水回り", h: 2, label: "浴槽", type: "bathtub", w: 1,
    color: { light: "#e0e0e0", dark: "#bbbbbb" }, icon: drawBathtub },
  { category: "水回り", h: 1, label: "洗面台", type: "washbasin", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" }, icon: drawWashbasin },
  { category: "水回り", h: 1, label: "洗面台(小)", type: "washbasin_half", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" }, icon: drawWashbasinHalf },
  { category: "水回り", h: 2, label: "洗面台(大)", type: "washbasin_large", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" },
    parts: (_cs: number, w: number, h: number, d: number) => [
      { color: { light: "#E8F4F8", dark: "#1a3a4a" },
        geometry: [w * 0.28, h * 0.8, d], position: [-w * 0.36, h * 0.4, 0] },
      { color: { light: "#EAD8C0", dark: "#6a5a40" },
        geometry: [w * 0.65, h, d], position: [w * 0.175, h * 0.5, 0] },
    ],
    icon: drawWashbasin },
  { category: "水回り", h: 1, label: "洗濯機", type: "washer", w: 1,
    color: { light: "#f0f0f0", dark: "#cccccc" }, heightFactor: 1.5, icon: drawWasher },

  // === キッチン ===
  { category: "キッチン", h: 2, label: "キッチン台(小)", type: "kitchen_small", w: 1,
    color: { light: "#d4a373", dark: "#8b6f47" }, icon: drawKitchen },
  { category: "キッチン", h: 3, label: "キッチン台", type: "kitchen", w: 1,
    color: { light: "#d4a373", dark: "#8b6f47" }, icon: drawKitchen },
  { category: "キッチン", h: 1, label: "冷蔵庫", type: "fridge", w: 1,
    color: { light: "#c0c0c0", dark: "#808080" }, heightFactor: 1.5, icon: drawFridge },

  // === リビング ===
  { category: "リビング", h: 2, label: "ソファ", type: "sofa", w: 1,
    color: { light: "#cd853f", dark: "#8b5a2b" },
    parts: (_cs: number, w: number, h: number, d: number) => [
      { color: { light: "#8B7D6B", dark: "#7a6e5e" },
        geometry: [w * 0.25, h * 0.8, d], position: [-w * 0.375, h * 0.6, 0] },
      { color: { light: "#A0907D", dark: "#8c7d6a" },
        geometry: [w * 0.45, h * 0.4, d], position: [w * 0.275, h * 0.2, 0] },
    ],
    icon: drawSofa },
  { category: "リビング", h: 2, label: "テレビ", type: "tv", w: 1,
    color: { light: "#1a1a1a", dark: "#0a0a0a" }, depthFactor: 0.15, icon: drawTv },
  { category: "リビング", h: 1, label: "棚", storageScore: 1, type: "shelf1", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" }, heightFactor: 1.5, icon: drawShelf },
  { category: "リビング", h: 2, label: "棚(2段)", storageScore: 2, type: "shelf2", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" }, heightFactor: 1.5, icon: drawShelf },
  { category: "リビング", h: 1, label: "椅子", type: "chair", w: 1,
    color: { light: "#8b5a2b", dark: "#5c3a1e" }, heightFactor: 0.5, icon: drawChair },
  { category: "リビング", h: 1, label: "机(小)", type: "desk_small", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" }, heightFactor: 0.5, icon: drawDesk },
  { category: "リビング", h: 2, label: "机(大)", type: "desk", w: 1,
    color: { light: "#a0522d", dark: "#6b3a1e" }, heightFactor: 0.5,
    parts: (_cs: number, w: number, h: number, d: number) => {
      const legS = Math.min(w, d) * 0.07;
      const legH = h * 0.75;
      const topH = h * 0.15;
      const inset = Math.min(w, d) * 0.1;
      const legs: MeshPart[] = [
        [-w / 2 + inset, -d / 2 + inset],
        [w / 2 - inset, -d / 2 + inset],
        [-w / 2 + inset, d / 2 - inset],
        [w / 2 - inset, d / 2 - inset],
      ].map(([lx, lz]) => ({
        color: { light: "#6B5030", dark: "#7a5830" },
        geometry: [legS * 2, legH, legS * 2] as [number, number, number],
        position: [lx, legH / 2, lz] as [number, number, number],
      }));
      legs.push({
        color: { light: "#D4B896", dark: "#b08a60" },
        geometry: [w, topH, d] as [number, number, number],
        position: [0, legH + topH / 2, 0] as [number, number, number],
      });
      return legs;
    },
    icon: drawDesk },

  // === 寝室 ===
  { category: "寝室", h: 2, label: "ベッド(シングル)", type: "bed_single", w: 1,
    color: { light: "#4682b4", dark: "#2f5a7a" }, heightFactor: 0.5, icon: drawBed },
  { category: "寝室", h: 2, label: "ベッド(ダブル)", type: "bed_double", w: 2,
    color: { light: "#4682b4", dark: "#2f5a7a" }, heightFactor: 0.5, icon: drawBed },
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
