export type RoundTileKey = string;
export type RoundEvent =
  | "dispatchAp"
  | "dispatchAc"
  | "dispatchAny"
  | "cohabit"
  | "deepen"
  | "acquire"
  | "promote";

export interface RoundTileDef {
  vpPer: number;
  event: RoundEvent;
}

export const ROUND_TILES: Record<RoundTileKey, RoundTileDef> = {
  "tile.dispatchAc": { vpPer: 1, event: "dispatchAc" },
  "tile.dispatchAp": { vpPer: 2, event: "dispatchAp" },
  "tile.dispatchAny": { vpPer: 1, event: "dispatchAny" },
  "tile.cohabit": { vpPer: 2, event: "cohabit" },
  "tile.acquire": { vpPer: 2, event: "acquire" },
  "tile.deepen": { vpPer: 3, event: "deepen" },
  "tile.promote": { vpPer: 2, event: "promote" },
};

export function scoreEvent(tile: RoundTileKey, ev: RoundEvent): number {
  const def = ROUND_TILES[tile];
  if (!def) return 0;
  if (def.event === ev) return def.vpPer;
  if (def.event === "dispatchAny" && (ev === "dispatchAc" || ev === "dispatchAp")) return def.vpPer;
  return 0;
}
