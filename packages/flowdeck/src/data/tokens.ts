export interface TokenDef {
  id: string;
  label: string;
  short: string;
  /** レーンに置いた時の作業レベル */
  workLevel: number;
  description: string;
}

export const TOKEN_DEFS: Record<string, TokenDef> = {
  mi: {
    id: "mi",
    label: "LLMトークン",
    short: "LLM",
    workLevel: 1,
    description: "任意のレーンにレベル1作業として置ける。アクションは消費しない。",
  },
};

export function tokenDef(id: string): TokenDef | null {
  return TOKEN_DEFS[id] ?? null;
}
