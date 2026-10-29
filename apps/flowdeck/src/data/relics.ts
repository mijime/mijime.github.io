export interface RelicDef {
  id: string;
  name: string;
  description: string;
}

export const RELIC_CAP = 2;
export const RELIC_CHOICES = 3;

export const RELICS: readonly RelicDef[] = [
  {
    id: "flow",
    name: "フロー",
    description: "全員、毎ターンのアクション +1",
  },
  {
    id: "insight",
    name: "洞察",
    description: "全員、毎ターンの手札 +1",
  },
  {
    id: "reserve",
    name: "予備電源",
    description: "取得時、全員のLLMトークン +1",
  },
  {
    id: "safety",
    name: "安全網",
    description: "全員、日開始時にシールド +1",
  },
  {
    id: "lean",
    name: "軽量化",
    description: "全員、1ターン1回の廃棄がアクション不要",
  },
  {
    id: "catalyst",
    name: "触媒",
    description: "全員、1ターン最初の効果カードでアクション +1",
  },
  {
    id: "tempo",
    name: "テンポ",
    description: "全員、日開始時にLLMトークン +1",
  },
  {
    id: "salvage",
    name: "回収",
    description: "全員、日開始時に捨て札から1枚を手札へ",
  },
];

export const RELIC_BY_ID = new Map(RELICS.map((relic) => [relic.id, relic]));

export function relicName(id: string): string {
  return RELIC_BY_ID.get(id)?.name ?? id;
}

export function relicDescription(id: string): string {
  return RELIC_BY_ID.get(id)?.description ?? "";
}
