import type { DoctrineKey, FactionKey, Tracks } from "../types.ts";

export type FactionAbility =
  | "feeWaiver"
  | "freeAcquire"
  | "zealVp"
  | "sageIncome"
  | "baseIncome3"
  | "lightDeepen";

export interface FactionDef {
  /** 固有能力 */
  ability: FactionAbility;
  /** 初期トラック位置の偏り */
  tracks: Partial<Tracks>;
  /** 固有教義(Lv1で開始、即時効果は適用しない) */
  doctrine: DoctrineKey;
}

export const FACTIONS: Record<FactionKey, FactionDef> = {
  senkyoshi: { ability: "feeWaiver", tracks: { mission: 2 }, doctrine: "fukyo" }, // 宣教師: 非隣接派遣の手数料免除
  shisai: { ability: "freeAcquire", tracks: { sacrament: 2 }, doctrine: "kyoka" }, // 司祭: 教義取得のトラック後退なし
  junkyosha: { ability: "zealVp", tracks: { sacrifice: 2 }, doctrine: "kenshin" }, // 殉教者: 昇格ごとに+1VP
  kenja: { ability: "sageIncome", tracks: { wisdom: 2 }, doctrine: "chishiki" }, // 賢者: 叡智4以上なら収入+1信徒
  kaitakusha: {
    ability: "baseIncome3",
    tracks: { mission: 1, sacrifice: 1 },
    doctrine: "michibiki",
  }, // 開拓者: 基礎収入が信徒3
  shinpika: { ability: "lightDeepen", tracks: { sacrament: 1, wisdom: 1 }, doctrine: "hitoku" }, // 神秘家: 深化コストが信徒2(使徒不要)
};

export const FACTION_KEYS = Object.keys(FACTIONS) as FactionKey[];
