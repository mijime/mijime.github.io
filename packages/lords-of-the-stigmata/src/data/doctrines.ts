import type { DoctrineDef, DoctrineKey } from "../types.ts";

export const DOCTRINES: Record<DoctrineKey, DoctrineDef> = {
  fukyo: { track: "mission", lv1: { ac: 1 }, lv2: { ac: 2 }, endVp: 2 },
  kenshin: { track: "sacrifice", lv1: { vp: 1 }, lv2: { ap: 1 }, endVp: 2 },
  michibiki: { track: "mission", lv1: { track: "mission" }, lv2: { vp: 2 }, endVp: 2 },
  kyoka: { track: "sacrament", lv1: { vp: 1 }, lv2: { track: "sacrament" }, endVp: 3 },
  hitoku: { track: "wisdom", lv1: { track: "wisdom" }, lv2: { ac: 1, vp: 1 }, endVp: 3 },
  shirushi: { track: "sacrament", lv1: { ac: 1 }, lv2: { vp: 3 }, endVp: 2 },
  chishiki: { track: "wisdom", lv1: { ac: 2 }, lv2: { track: "wisdom" }, endVp: 3 },
  shugo: { track: "sacrifice", lv1: { track: "sacrifice" }, lv2: { ac: 2 }, endVp: 2 },
  tettai: { track: "sacrifice", lv1: { ac: 1 }, lv2: { vp: 2 }, endVp: 2 },
  yugo: { track: "wisdom", lv1: { vp: 1 }, lv2: { ap: 1 }, endVp: 3 },
};

export const DKEYS = Object.keys(DOCTRINES);
