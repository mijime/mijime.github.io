import { describe, expect, it } from "vitest";
import { createEngine, dispatch, startGame } from "../src/engine/engine.ts";
import { DOCTRINES } from "../src/data/doctrines.ts";

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
  startGame(e, 2, SEL, 0, [], TILES); // 2 CPUs = 3 total players (p0=human, p1=CPU, p2=CPU)
  return e;
}

describe("doctrines", () => {
  it("all 10 doctrines have track/lv1/lv2/endVp", () => {
    expect(Object.keys(DOCTRINES)).toHaveLength(10);
    for (const d of Object.values(DOCTRINES)) {
      expect(d.track).toBeDefined();
      expect(d.endVp).toBeGreaterThan(0);
    }
  });

  it("acquire advances the doctrine's own track and applies lv1 (fukyo: mission+1, ac+1)", () => {
    const e = newGame();
    dispatch(e, { type: "chooseAction", action: { type: "acquire", doc: "fukyo" } });
    const p = e.S.players[0];
    expect(p.doctrines).toEqual([{ key: "fukyo", lv: 1 }]);
    expect(p.tracks.mission).toBe(1);
    // ac: 3 - 2(cost) + 1(lv1) = 2
    expect(p.act.ac).toBe(2);
  });

  it("acquire is rejected when player already holds 3 doctrines", () => {
    const e = newGame();
    e.S.players[0].act.ac = 20;
    e.S.players[0].tracks.wisdom = 5;
    // Manually set doctrines to test the limit
    e.S.players[0].doctrines.push({ key: "fukyo", lv: 1 });
    e.S.players[0].doctrines.push({ key: "kenshin", lv: 1 });
    e.S.players[0].doctrines.push({ key: "kyoka", lv: 1 });
    // Try to acquire a 4th (should be rejected)
    dispatch(e, { type: "chooseAction", action: { type: "acquire", doc: "yugo" } });
    expect(e.S.players[0].doctrines).toHaveLength(3);
    expect(e.pending).toEqual({ kind: "action", pi: 0 }); // 無効=再入力
  });

  it("deepen applies lv2 (kenshin: ap+1)", () => {
    const e = newGame();
    e.S.players[0].act = { ac: 10, ap: 1 };
    dispatch(e, { type: "chooseAction", action: { type: "acquire", doc: "kenshin" } });
    dispatch(e, { type: "tick" });
    // 手番が一巡して p0 に戻るまで他プレイヤーはパス
    dispatch(e, { type: "chooseAction", action: { type: "pass" } });
    dispatch(e, { type: "tick" });
    dispatch(e, { type: "chooseAction", action: { type: "pass" } });
    dispatch(e, { type: "tick" });
    dispatch(e, { type: "chooseAction", action: { type: "deepen", doc: "kenshin" } });
    const p = e.S.players[0];
    expect(p.doctrines[0].lv).toBe(2);
    // ap: 1 - 1(cost) + 1(lv2) = 1
    expect(p.act.ap).toBe(1);
  });
});
