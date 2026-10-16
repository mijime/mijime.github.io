import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import type { Building, EdgeRef, FloorPlan } from "../types";
import { setWallsPure } from "./walls";
import { computeStructuralReport } from "./structural-report";

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

function sixByTwo(): Building {
  const f1 = enclose(createFloorPlan("1F", 10, 10), 1, 1, 8, 8);
  const f2 = enclose(createFloorPlan("2F", 10, 10), 1, 1, 5, 5);
  return {
    cellSize: 32,
    floors: [f1, f2],
    structural: { construction: "post_and_beam_panel", region: "東京都", storyHeightMm: 2800 },
  };
}

describe("computeStructuralReport", () => {
  it("returns one entry per floor with seismic, strength and stiffness metrics", () => {
    const report = computeStructuralReport(sixByTwo());
    expect(report.floors).toHaveLength(2);
    const ground = report.floors[0];
    expect(ground.seismic.requiredMultiplierLengthM).toBeGreaterThan(0);
    expect(ground.strength.hMultiplierLengthM).toBeGreaterThan(0);
    expect(ground.eccentricity).not.toBeNull();
    expect(ground.rigidity).toBeDefined();
    expect(ground.drift).toBeDefined();
    expect(ground.stiffness.kxKnPerM).toBeGreaterThan(0);
    expect(ground.strength.multiplier).toBe(2.5);
  });

  it("requires more wall on the lower story", () => {
    const report = computeStructuralReport(sixByTwo());
    expect(report.floors[0].seismic.requiredMultiplierLengthM).toBeGreaterThan(
      report.floors[1].seismic.requiredMultiplierLengthM,
    );
  });

  it("has a positive drift when seismic force exists", () => {
    const report = computeStructuralReport(sixByTwo());
    expect(report.floors[0].drift!.driftH).toBeGreaterThan(0);
  });
});
