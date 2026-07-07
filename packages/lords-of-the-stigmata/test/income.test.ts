import { describe, expect, it } from "vitest";
import { applyIncome, calcIncome } from "../src/engine/income.ts";
import type { BoardCountry, Player } from "../src/types.ts";

const pawn = (owner: number, type: "ac" | "ap") => ({ owner, type, seq: 1, uid: 1 });

describe("calcIncome", () => {
  it("base income is 2 followers with empty board", () => {
    expect(calcIncome([], 0)).toEqual({ ac: 2, ap: 0 });
  });
  it("+1 follower per 2 own pawns, +1 apostle per 2 own apostles", () => {
    const board: BoardCountry[] = [
      { key: "A", pawns: [pawn(0, "ac"), pawn(0, "ac"), pawn(1, "ap")] },
      { key: "B", pawns: [pawn(0, "ap"), pawn(0, "ap")] },
    ];
    // 自ポーン4体→+2信徒、自使徒2体→+1使徒
    expect(calcIncome(board, 0)).toEqual({ ac: 4, ap: 1 });
  });
});

it("applyIncome adds to activity area", () => {
  const p = { act: { ac: 1, ap: 0 } } as Player;
  applyIncome(p, { ac: 2, ap: 1 });
  expect(p.act).toEqual({ ac: 3, ap: 1 });
});
