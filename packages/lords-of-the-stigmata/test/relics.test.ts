import { describe, expect, it } from "vitest";
import { createEngine, dispatch, startGame } from "../src/engine/engine.ts";
import { RELICS } from "../src/data/relics.ts";
import { finalScore } from "../src/engine/scoring.ts";

const SEL = ["A", "B", "C", "D", "E", "F", "G"];
const TILES = [
  "tile.dispatchAc",
  "tile.dispatchAp",
  "tile.acquire",
  "tile.deepen",
  "tile.promote",
  "tile.dispatchAc",
];
const POOL = ["honoo", "rashinban", "shokan", "seiyaku", "monsho", "izumi"];

describe("relics", () => {
  it("all relics define vp and cond", () => {
    for (const r of Object.values(RELICS)) {
      expect(r.vp).toBeGreaterThan(0);
      expect(typeof r.cond).toBe("function");
    }
  });

  it("first player to satisfy the round relic's condition takes it", () => {
    const e = createEngine();
    startGame(e, 2, SEL, 0, POOL, TILES); // round1 の聖遺物 = honoo (mission>=4)
    e.S.players[0].tracks.mission = 3;
    // A への派遣で mission+1 → 4 に到達 → 獲得
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "A" } });
    expect(e.S.players[0].relics).toEqual(["honoo"]);
    expect(e.S.relicsTaken.honoo).toBe(0);
  });

  it("a taken relic is not awarded twice", () => {
    const e = createEngine();
    startGame(e, 2, SEL, 0, POOL, TILES);
    e.S.players[0].tracks.mission = 4;
    e.S.players[1].tracks.mission = 4;
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "F" } }); // p0 が先に達成済みで獲得
    dispatch(e, { type: "tick" });
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "F" } }); // p1
    expect(e.S.players[1].relics).toEqual([]);
  });

  it("relic vp counts in final score", () => {
    const base = {
      vp: 0,
      tracks: { mission: 0, sacrament: 0, sacrifice: 0, wisdom: 0 },
      doctrines: [],
      relics: [] as string[],
    };
    const scores = finalScore({
      players: [{ ...base, relics: ["honoo"] }, { ...base }],
      board: [],
      adj: {},
    });
    expect(scores[0] - scores[1]).toBe(3);
  });
});
