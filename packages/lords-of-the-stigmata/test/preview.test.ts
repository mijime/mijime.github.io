import { describe, expect, it } from "vitest";
import { createEngine, dispatch, startGame } from "../src/engine/engine.ts";
import { previewDispatch } from "../src/engine/preview.ts";

const SEL = ["A", "B", "C", "D", "E", "F", "G"];
const TILES = [
  "tile.dispatchAc",
  "tile.dispatchAp",
  "tile.acquire",
  "tile.deepen",
  "tile.promote",
  "tile.dispatchAc",
];

describe("previewDispatch", () => {
  it("empty country: placing makes you sole ruler", () => {
    const e = createEngine();
    startGame(e, 2, SEL, 0, [], TILES);
    const pv = previewDispatch(e.S, 0, "ac", "A");
    expect(pv.ok).toBe(true);
    expect(pv.costAc).toBe(2); // 非隣接: コマ1+手数料1
    expect(pv.rankBefore).toBe(0);
    expect(pv.rankAfter).toBe(1);
    expect(pv.tieAfter).toBe(false);
  });

  it("prediction does not mutate state", () => {
    const e = createEngine();
    startGame(e, 2, SEL, 0, [], TILES);
    const before = JSON.stringify(e.S.board);
    previewDispatch(e.S, 0, "ap", "A");
    expect(JSON.stringify(e.S.board)).toBe(before);
  });

  it("apostle (infl 3) can overtake a follower (infl 1)", () => {
    const e = createEngine();
    startGame(e, 2, SEL, 0, [], TILES);
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "A" } }); // p0
    // p1(手番)視点: Aにapを置けば1位を奪える
    const pv = previewDispatch(e.S, 1, "ap", "A");
    expect(pv.ok).toBe(true);
    expect(pv.rankBefore).toBe(0);
    expect(pv.rankAfter).toBe(1);
  });
});
