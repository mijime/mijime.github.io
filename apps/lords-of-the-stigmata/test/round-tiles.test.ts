import { expect, it } from "vitest";
import { ROUND_TILES, scoreEvent } from "../src/engine/round-tiles.ts";

it("has at least 5 tiles covering each event", () => {
  const events = new Set(Object.values(ROUND_TILES).map((t) => t.event));
  expect(events).toEqual(
    new Set(["dispatchAp", "dispatchAc", "dispatchAny", "cohabit", "deepen", "acquire", "promote"]),
  );
});

it("scoreEvent returns vpPer on match, 0 otherwise", () => {
  expect(scoreEvent("tile.deepen", "deepen")).toBe(3);
  expect(scoreEvent("tile.deepen", "acquire")).toBe(0);
});

it("dispatchAny tile scores for both pawn kinds", () => {
  expect(scoreEvent("tile.dispatchAny", "dispatchAc")).toBe(1);
  expect(scoreEvent("tile.dispatchAny", "dispatchAp")).toBe(1);
});

it("cohabit tile scores 2", () => {
  expect(scoreEvent("tile.cohabit", "cohabit")).toBe(2);
});
