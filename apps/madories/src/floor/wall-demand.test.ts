import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import type { EdgeRef, FloorPlan } from "../types";
import { setWallsPure } from "./walls";
import { computeEccentricity } from "./stiffness";
import { computeWallDemands } from "./wall-demand";

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

describe("computeWallDemands", () => {
  it("splits shear evenly when the plan is centered (no torsion)", () => {
    const floor = enclose(createFloorPlan("t", 8, 8), 1, 1, 4, 4);
    const ecc = computeEccentricity(floor);
    const q = 10_000; // N
    const demands = computeWallDemands(floor, q, ecc, "post_and_beam_panel");
    expect(demands).toHaveLength(4);
    const first = demands[0].utilization;
    for (const d of demands) {
      expect(d.utilization).toBeCloseTo(first, 6);
    }
    // ねじれ0なので方向別の負担合計 = 層せん断力（X, Y それぞれに作用）
    let hTotal = 0;
    let vTotal = 0;
    for (const d of demands) {
      if (d.kind === "h") {
        hTotal += Math.abs(d.shearKn);
      } else {
        vTotal += Math.abs(d.shearKn);
      }
    }
    expect(hTotal).toBeCloseTo(q / 1000, 6);
    expect(vTotal).toBeCloseTo(q / 1000, 6);
  });

  it("adds torsion to walls far from the stiffness center", () => {
    let floor = enclose(createFloorPlan("t", 12, 12), 1, 1, 8, 8);
    floor = setWallsPure(
      floor,
      [
        { kind: "v", x: 8, y: 1 },
        { kind: "v", x: 8, y: 2 },
        { kind: "v", x: 8, y: 3 },
        { kind: "v", x: 8, y: 4 },
      ],
      "solid",
    );
    const ecc = computeEccentricity(floor)!;
    expect(Math.abs(ecc.ex)).toBeGreaterThan(0);
    const demands = computeWallDemands(floor, 20_000, ecc, "post_and_beam_panel");
    const vertical = demands.filter((d) => d.kind === "v").map((d) => d.utilization);
    const max = Math.max(...vertical);
    const min = Math.min(...vertical);
    expect(max).toBeGreaterThan(min);
  });

  it("returns nothing for a floor without walls", () => {
    expect(
      computeWallDemands(createFloorPlan("t", 8, 8), 10_000, null, "post_and_beam_panel"),
    ).toEqual([]);
  });
});
