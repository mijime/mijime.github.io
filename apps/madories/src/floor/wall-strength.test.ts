import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import type { EdgeRef, FloorPlan } from "../types";
import { setWallsPure } from "./walls";
import { computeWallStrength, multiplierLengthToStrengthKn } from "./wall-strength";

function enclose(floor: FloorPlan, x1: number, y1: number, x2: number, y2: number): FloorPlan {
  const edges: EdgeRef[] = [];
  for (let x = x1; x <= x2; x++) {
    edges.push({ kind: "h", x, y: y1 }, { kind: "h", x, y: y2 + 1 });
  }
  for (let y = y1; y <= y2; y++) {
    edges.push({ kind: "v", x: x1, y }, { kind: "v", x: x2 + 1, y });
  }
  return setWallsPure(floor, edges, "solid");
}

describe("computeWallStrength", () => {
  it("sums multiplier-weighted length per direction", () => {
    const floor = enclose(createFloorPlan("t", 8, 8), 1, 1, 4, 4);
    const s = computeWallStrength(floor, "post_and_beam_panel");
    // 4セル×0.455m×2辺(上下) = 3.64m、壁倍率2.5 → 9.1
    expect(s.hMultiplierLengthM).toBeCloseTo(2.5 * 2 * 4 * 0.455, 5);
    expect(s.vMultiplierLengthM).toBeCloseTo(2.5 * 2 * 4 * 0.455, 5);
    expect(s.multiplier).toBe(2.5);
    expect(s.panels).toHaveLength(4);
  });

  it("uses the brace preset multiplier", () => {
    const floor = enclose(createFloorPlan("t", 8, 8), 1, 1, 4, 4);
    const s = computeWallStrength(floor, "post_and_beam_brace");
    expect(s.hMultiplierLengthM).toBeCloseTo(2 * 2 * 4 * 0.455, 5);
  });

  it("converts multiplier length to strength", () => {
    expect(multiplierLengthToStrengthKn(10)).toBeCloseTo(19.6);
  });
});
