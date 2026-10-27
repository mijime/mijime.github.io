import { describe, expect, it } from "vitest";
import {
  advanceTrack,
  emptyTracks,
  retreatTrack,
  trackRankVP,
  TRACK_MAX,
} from "../src/engine/tracks.ts";
import type { Tracks } from "../src/types.ts";

const mk = (mission = 0, sacrament = 0, sacrifice = 0, wisdom = 0): Tracks => ({
  mission,
  sacrament,
  sacrifice,
  wisdom,
});

describe("advance/retreat", () => {
  it("advances and clamps at TRACK_MAX", () => {
    const t = emptyTracks();
    expect(advanceTrack(t, "mission", 3)).toBe(3);
    expect(advanceTrack(t, "mission", TRACK_MAX)).toBe(TRACK_MAX - 3);
    expect(t.mission).toBe(TRACK_MAX);
  });
  it("retreats and clamps at 0", () => {
    const t = mk(2);
    expect(retreatTrack(t, "mission", 5)).toBe(2);
    expect(t.mission).toBe(0);
  });
});

describe("trackRankVP", () => {
  it("awards 8/4/2 for distinct values", () => {
    expect(trackRankVP([mk(5), mk(3), mk(1)], "mission")).toEqual([8, 4, 2]);
  });
  it("splits tied ranks (TM-style, floor)", () => {
    // 1位タイ2人: (8+4)/2=6ずつ、次点は3位VP
    expect(trackRankVP([mk(5), mk(5), mk(1)], "mission")).toEqual([6, 6, 2]);
    // 2位タイ2人: (4+2)/2=3ずつ
    expect(trackRankVP([mk(5), mk(3), mk(3), mk(1)], "mission")).toEqual([8, 3, 3, 0]);
  });
  it("value 0 earns nothing", () => {
    expect(trackRankVP([mk(2), mk(0)], "mission")).toEqual([8, 0]);
  });
});
