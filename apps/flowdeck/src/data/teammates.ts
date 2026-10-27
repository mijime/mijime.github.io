export interface Teammate {
  id: string;
  name: string;
}

/** 名前だけ固定。性格・アイコンは開始時にランダムに決まる。 */
export const TEAMMATES: Teammate[] = [
  { id: "p2", name: "ミナ" },
  { id: "p3", name: "ソウタ" },
  { id: "p4", name: "アオイ" },
  { id: "p5", name: "ハル" },
  { id: "p6", name: "ナオ" },
  { id: "p7", name: "レン" },
  { id: "p8", name: "カイ" },
  { id: "p9", name: "ユキ" },
  { id: "p10", name: "トウマ" },
  { id: "p11", name: "メイ" },
  { id: "p12", name: "リク" },
];
