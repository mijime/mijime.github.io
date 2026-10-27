import { describe, expect, it } from "vitest";
import { createEngine, dispatch, startGame } from "../src/engine/engine.ts";
import { COUNTRIES } from "../src/data/countries.ts";

const SEL = ["A", "B", "C", "D", "E", "F", "G"];
const TILES = [
  "tile.dispatchAc",
  "tile.dispatchAp",
  "tile.acquire",
  "tile.deepen",
  "tile.promote",
  "tile.dispatchAc",
];

function newGame() {
  const e = createEngine();
  startGame(e, 2, SEL, 0, [], TILES);
  return e;
}

describe("country effects", () => {
  it("all 15 countries define an effect", () => {
    for (const def of Object.values(COUNTRIES)) {
      expect(def.effect).toBeDefined();
    }
  });

  it("dispatch applies the country effect to the dispatcher (A: mission+1)", () => {
    const e = newGame();
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "A" } });
    expect(e.S.players[0].tracks.mission).toBe(1);
  });

  it("dispatch to F grants 1 follower (net cost: pawn+fee-1)", () => {
    const e = newGame();
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "F" } });
    // 3 - 1(pawn) - 1(fee) + 1(effect) = 2
    expect(e.S.players[0].act.ac).toBe(2);
  });

  it("apExtra doubles the effect for apostle dispatch (SEL includes H)", () => {
    const e = createEngine();
    startGame(e, 2, ["H", "B", "C", "D", "E", "F", "G"], 0, [], TILES);
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ap", country: "H" } });
    expect(e.S.players[0].tracks.mission).toBe(2);
  });

  it("cohabitant gains +1 on the country's effect track (fallback mission)", () => {
    const e = newGame();
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "B" } }); // p0
    dispatch(e, { type: "tick" });
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "B" } }); // p1 相席
    // p0 は B の効果トラック(sacrament)を相席ボーナスで+1(自身の派遣分1と合わせて2)
    expect(e.S.players[0].tracks.sacrament).toBe(2);
  });
});
