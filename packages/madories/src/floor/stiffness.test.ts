import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import type { EdgeRef, FloorPlan } from "../types";
import { setWallsPure } from "./walls";
import {
  computeEccentricity,
  computeRigidityRatios,
  computeStoryStiffnesses,
  formatDriftRatio,
} from "./stiffness";

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

describe("computeStoryStiffnesses", () => {
  it("derives directional stiffness from multiplier length", () => {
    const floor = enclose(createFloorPlan("t", 8, 8), 1, 1, 4, 4);
    const [s] = computeStoryStiffnesses([floor], "post_and_beam_panel", 2.8);
    expect(s.hMultiplierLengthM).toBeCloseTo(9.1, 5);
    expect(s.kxKnPerM).toBeCloseTo(9.1 * 1.96 * (120 / 2.8), 3);
  });

  it("gives weaker upper stories less stiffness", () => {
    const lower = enclose(createFloorPlan("1F", 8, 8), 1, 1, 4, 4);
    const upper = enclose(createFloorPlan("2F", 8, 8), 1, 1, 2, 2);
    const [s1, s2] = computeStoryStiffnesses([lower, upper], "post_and_beam_panel", 2.8);
    expect(s1.kxKnPerM).toBeGreaterThan(s2.kxKnPerM);
  });
});

describe("computeEccentricity", () => {
  it("is centered for a symmetric plan", () => {
    const floor = enclose(createFloorPlan("t", 8, 8), 1, 1, 4, 4);
    const e = computeEccentricity(floor, "post_and_beam_panel")!;
    expect(e.ex).toBeCloseTo(0, 5);
    expect(e.ey).toBeCloseTo(0, 5);
    expect(e.ok).toBe(true);
  });

  it("grows when stiffness is unevenly distributed", () => {
    let floor = enclose(createFloorPlan("t", 12, 12), 1, 1, 8, 8);
    // 追加の縦壁を右側に寄せ、剛心Xを重心から離す
    floor = setWallsPure(
      floor,
      [
        { kind: "v", x: 8, y: 1 },
        { kind: "v", x: 8, y: 2 },
        { kind: "v", x: 8, y: 3 },
      ],
      "solid",
    );
    const e = computeEccentricity(floor, "post_and_beam_panel")!;
    expect(e.ex).toBeGreaterThan(0);
  });

  it("returns null when a direction has no wall", () => {
    const floor = setWallsPure(createFloorPlan("t", 8, 8), [{ kind: "h", x: 1, y: 1 }], "solid");
    expect(computeEccentricity(floor, "post_and_beam_panel")).toBeNull();
  });
});

describe("formatDriftRatio", () => {
  it("formats a normal ratio as 1/n", () => {
    expect(formatDriftRatio(1 / 250)).toBe("1/250");
    expect(formatDriftRatio(1 / 200)).toBe("1/200");
  });

  it("never produces broken strings for 0/NaN/Infinity or extremes", () => {
    expect(formatDriftRatio(0)).toBe("—");
    expect(formatDriftRatio(Number.NaN)).toBe("—");
    expect(formatDriftRatio(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatDriftRatio(2)).toBe("1/1未満");
    expect(formatDriftRatio(1e-9)).toBe("1/9999超");
  });
});

describe("computeRigidityRatios", () => {
  it("is 1.0 for equal stories and flags uneven ones", () => {
    const strong = enclose(createFloorPlan("t", 8, 8), 1, 1, 5, 5);
    const weak = enclose(createFloorPlan("t", 8, 8), 1, 1, 2, 2);
    const equal = computeRigidityRatios(
      computeStoryStiffnesses([strong, strong], "post_and_beam_panel", 2.8),
    );
    expect(equal[0].rsH).toBeCloseTo(1, 5);
    expect(equal[0].okH).toBe(true);

    const uneven = computeRigidityRatios(
      computeStoryStiffnesses([strong, weak], "post_and_beam_panel", 2.8),
    );
    expect(uneven[1].rsH).toBeLessThan(0.6);
    expect(uneven[1].okH).toBe(false);
  });
});
