import { describe, expect, it } from "vitest";
import { createGame } from "../setup";
import { playBotRound } from "../sim/run";
import {
  BALANCED_ARCHETYPE,
  PLAYER_ARCHETYPES,
  archetypeById,
  classifyPlayer,
  scorePlayerArchetypes,
} from "./playerTypes";

function finishedGame(seed = 42) {
  const state = createGame(seed, 10, 4);
  let guard = 0;
  while (state.phase !== "over" && guard < 20) {
    playBotRound(state);
    guard += 1;
  }
  return state;
}

describe("player archetypes", () => {
  it("24の専門型とバランス型を定義している", () => {
    expect(PLAYER_ARCHETYPES).toHaveLength(25);
    expect(new Set(PLAYER_ARCHETYPES.map((type) => type.id)).size).toBe(25);
    expect(new Set(PLAYER_ARCHETYPES.map((type) => type.label)).size).toBe(25);
    expect(PLAYER_ARCHETYPES).toContain(BALANCED_ARCHETYPE);
    expect(archetypeById("unknown")).toBe(BALANCED_ARCHETYPE);
  });

  it("ゲーム終了時に全員へタイプが割り当てられる", () => {
    const state = finishedGame();
    const team = state.outcome?.perPlayer ?? [];
    expect(team).toHaveLength(5);
    for (const player of team) {
      expect(player.archetypeId).toBeTruthy();
      expect(PLAYER_ARCHETYPES.some((type) => type.id === player.archetypeId)).toBe(true);
      expect(player.analytics).toBeDefined();
    }
    expect(new Set(team.map((player) => player.archetypeId)).size).toBeGreaterThan(1);
  });

  it("チーム内で最も強い軸のタイプを選ぶ", () => {
    const state = finishedGame();
    const team = state.outcome?.perPlayer ?? [];
    for (const player of team) {
      const top = scorePlayerArchetypes(player, team)[0];
      expect(top).toBeDefined();
      expect(top?.score).toBeGreaterThanOrEqual(0);
      expect(classifyPlayer(player, team)).toBeTruthy();
    }
  });
});
