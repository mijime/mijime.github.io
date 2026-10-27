import { describe, expect, it } from "vitest";
import { createEngine, dispatch, startGame } from "../src/engine/engine.ts";
import { calcIncome } from "../src/engine/income.ts";
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

function newGame(factions?: FactionKey[]) {
  const e = createEngine();
  startGame(e, 2, SEL, 0, [], TILES, factions);
  return e;
}

describe("factions", () => {
  it("startGame applies initial track bias and starting doctrine", () => {
    const e = newGame(["senkyoshi", "shisai", "junkyosha"]);
    expect(e.S.players[0].faction).toBe("senkyoshi");
    expect(e.S.players[0].tracks.mission).toBe(2);
    expect(e.S.players[0].doctrines).toEqual([{ key: "fukyo", lv: 1 }]);
    expect(e.S.players[1].tracks.sacrament).toBe(2);
  });

  it("feeWaiver: non-adjacent dispatch costs no fee", () => {
    const e = newGame(["senkyoshi", "shisai", "junkyosha"]);
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "B" } });
    // 3 - 1(pawn) - 0(fee免除) = 2 (Bの効果はトラックのみ)
    expect(e.S.players[0].act.ac).toBe(2);
  });

  it("freeAcquire: acquire does not retreat any track", () => {
    const e = newGame(["shisai", "senkyoshi", "junkyosha"]);
    const before = { ...e.S.players[0].tracks };
    dispatch(e, { type: "chooseAction", action: { type: "acquire", doc: "yugo" } });
    // yugo: wisdom+1(track) のみ増える。後退はどのトラックにも起きない
    expect(e.S.players[0].tracks.sacrament).toBe(before.sacrament);
    expect(e.S.players[0].tracks.wisdom).toBe(before.wisdom + 1);
  });

  it("zealVp: 1st promote does not grant +1 VP (count=1 is odd)", () => {
    const e = newGame(["junkyosha", "shisai", "senkyoshi"]);
    dispatch(e, { type: "chooseAction", action: { type: "promote" } });
    // 1st promote (count=1, odd): tile.promote は 0、zealVp は 0 (only every 2nd)
    expect(e.S.players[0].vp).toBe(0);
  });

  it("zealVp: 2nd promote grants +1 VP (count=2 is even)", () => {
    const e = newGame(["junkyosha", "shisai", "senkyoshi"]);
    const p = e.S.players[0];
    p.act.ac = 6;
    dispatch(e, { type: "chooseAction", action: { type: "promote" } });
    // 1st promote (count=1, odd)
    expect(p.vp).toBe(0);
    expect(p.promoteCount).toBe(1);
    // other players pass to get back to player 0's turn
    dispatch(e, { type: "chooseAction", action: { type: "pass" } }); // p1
    dispatch(e, { type: "chooseAction", action: { type: "pass" } }); // p2
    // p0's turn again
    dispatch(e, { type: "chooseAction", action: { type: "promote" } });
    // 2nd promote (count=2, even): tile.promote は 0、zealVp で 1
    expect(p.vp).toBe(1);
    expect(p.promoteCount).toBe(2);
  });

  it("lightDeepen: deepen costs 2 followers instead of ac1+ap1", () => {
    const e = newGame(["shinpika", "shisai", "senkyoshi"]);
    const p = e.S.players[0];
    p.act = { ac: 4, ap: 0 };
    // hitoku を Lv1 で所持して開始している
    dispatch(e, { type: "chooseAction", action: { type: "deepen", doc: "hitoku" } });
    expect(p.doctrines[0].lv).toBe(2);
    // 4 - 2(cost) + 1(hitoku lv2のac+1) = 3, ap は 0 のまま
    expect(p.act).toEqual({ ac: 3, ap: 0 });
  });

  it("baseIncome3 / sageIncome affect calcIncome", () => {
    expect(
      calcIncome([], 0, {
        faction: "kaitakusha",
        tracks: { mission: 0, sacrament: 0, sacrifice: 0, wisdom: 0 },
      }).ac,
    ).toBe(3);
    expect(
      calcIncome([], 0, {
        faction: "kenja",
        tracks: { mission: 0, sacrament: 0, sacrifice: 0, wisdom: 4 },
      }).ac,
    ).toBe(3);
    expect(
      calcIncome([], 0, {
        faction: "kenja",
        tracks: { mission: 0, sacrament: 0, sacrifice: 0, wisdom: 3 },
      }).ac,
    ).toBe(2);
  });
});
