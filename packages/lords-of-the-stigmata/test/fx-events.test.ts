import { describe, expect, it } from "vitest";
import { createEngine, dispatch, startGame } from "../src/engine/engine.ts";
import type { Engine } from "../src/types.ts";

const SEL = ["A", "B", "C", "D", "E", "F", "G"];
const TILES = [
  "tile.dispatchAc",
  "tile.dispatchAp",
  "tile.acquire",
  "tile.deepen",
  "tile.promote",
  "tile.dispatchAc",
];

function newGame(): Engine {
  const e = createEngine();
  startGame(e, 2, SEL, 0, [], TILES);
  return e;
}

describe("fx events", () => {
  it("starts with a phase fx for action phase", () => {
    const e = newGame();
    expect(e.fx.some((f) => f.kind === "phase" && f.phase === "action")).toBe(true);
  });

  it("dispatch emits dispatch fx with uid and vp fx for tile score", () => {
    const e = newGame();
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "A" } });
    const d = e.fx.find((f) => f.kind === "dispatch");
    expect(d).toMatchObject({ pi: 0, pawn: "ac", country: "A" });
    expect(d && "uid" in d && d.uid).toBeGreaterThan(0);
    expect(e.fx.some((f) => f.kind === "vp" && f.pi === 0 && f.n === 1)).toBe(true);
  });

  it("promote/pass emit fx", () => {
    const e = newGame();
    dispatch(e, { type: "chooseAction", action: { type: "promote" } });
    expect(e.fx.some((f) => f.kind === "promote" && f.pi === 0)).toBe(true);
    dispatch(e, { type: "chooseAction", action: { type: "pass" } });
    expect(e.fx.some((f) => f.kind === "pass")).toBe(true);
  });

  it("fx ids are strictly increasing", () => {
    const e = newGame();
    dispatch(e, { type: "chooseAction", action: { type: "dispatch", pawn: "ac", country: "A" } });
    const ids = e.fx.map((f) => f.id);
    expect(ids).toEqual([...ids].toSorted((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
