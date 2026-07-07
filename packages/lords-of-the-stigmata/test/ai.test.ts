import { describe, expect, it } from "vitest";
import { createEngine, dispatch, startGame } from "../src/engine/engine.ts";
import { decideAction, legalActions } from "../src/engine/ai.ts";
import { scoreAction } from "../src/engine/ai-scoring.ts";
import type { FactionKey } from "../src/types.ts";

const SEL = ["A", "B", "C", "D", "E", "F", "G"];
const TILES = [
  "tile.dispatchAc",
  "tile.dispatchAp",
  "tile.acquire",
  "tile.deepen",
  "tile.promote",
  "tile.dispatchAc",
];
const FACTIONS3: FactionKey[] = ["senkyoshi", "shisai", "junkyosha"];

function newGame() {
  const e = createEngine();
  startGame(
    e,
    2,
    SEL,
    0,
    ["honoo", "rashinban", "shokan", "seiyaku", "monsho", "izumi"],
    TILES,
    FACTIONS3,
  );
  return e;
}

describe("ai", () => {
  it("legalActions mirrors engine guards (fee, seats, doctrine limits)", () => {
    const e = newGame();
    const acts = legalActions(e, 0);
    expect(acts.length).toBeGreaterThan(0);
    // すべての合法手はエンジンに拒否されない: 実行して pending が次へ進むこと
    for (const a of acts.slice(0, 3)) {
      const e2 = newGame();
      dispatch(e2, { type: "chooseAction", action: a });
      expect(e2.pending).not.toEqual({ kind: "action", pi: 0 }); // 再入力になっていない
    }
  });

  it("returns pass when no resources", () => {
    const e = newGame();
    e.S.players[1].act = { ac: 0, ap: 0 };
    expect(decideAction(e, 1)).toEqual({ type: "pass" });
  });

  it("decideAction picks the argmax of scoreAction over legalActions", () => {
    const e = newGame();
    const acts = legalActions(e, 1);
    const best = decideAction(e, 1);
    const max = Math.max(...acts.map((a) => scoreAction(e, 1, a)));
    expect(scoreAction(e, 1, best)).toBe(max);
  });

  it("a tile-scored promote outranks the same promote without the tile", () => {
    const e1 = createEngine();
    startGame(
      e1,
      2,
      SEL,
      0,
      [],
      [
        "tile.promote",
        "tile.dispatchAc",
        "tile.acquire",
        "tile.deepen",
        "tile.dispatchAp",
        "tile.dispatchAc",
      ],
      FACTIONS3,
    );
    const e2 = newGame(); // round1 = tile.dispatchAc
    expect(scoreAction(e1, 1, { type: "promote" })).toBeGreaterThan(
      scoreAction(e2, 1, { type: "promote" }),
    );
  });

  it("is deterministic", () => {
    const e1 = newGame();
    const e2 = newGame();
    expect(decideAction(e1, 1)).toEqual(decideAction(e2, 1));
  });
});
