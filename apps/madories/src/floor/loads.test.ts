import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import type { Building, EdgeRef, FloorPlan } from "../types";
import { setWallsPure } from "./walls";
import { DEFAULT_STRUCTURAL_CONDITIONS } from "./structural-conditions";
import {
  computeSeismicShear,
  computeStoryGeometries,
  computeStoryWeights,
  STANDARD_SHEAR_COEFFICIENT,
} from "./loads";

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

function twoStory(): Building {
  const f1 = enclose(createFloorPlan("1F", 8, 8), 1, 1, 4, 4); // 4x4 cells
  const f2 = enclose(createFloorPlan("2F", 8, 8), 1, 1, 2, 2); // 2x2 cells
  return { cellSize: 32, floors: [f1, f2], structural: DEFAULT_STRUCTURAL_CONDITIONS };
}

describe("computeStoryGeometries", () => {
  it("measures area and perimeter from the wall bounding box", () => {
    const g = computeStoryGeometries([enclose(createFloorPlan("t", 8, 8), 1, 1, 4, 4)], {
      storyHeightMm: 2800,
    })[0];
    expect(g.areaM2).toBeCloseTo(1.82 ** 2, 5);
    expect(g.perimeterM).toBeCloseTo(2 * 1.82 * 2, 5);
    expect(g.storyHeightM).toBeCloseTo(2.8);
  });

  it("returns zero for a floor with no walls", () => {
    const g = computeStoryGeometries([createFloorPlan("t", 8, 8)], undefined)[0];
    expect(g.areaM2).toBe(0);
    expect(g.perimeterM).toBe(0);
  });
});

describe("computeStoryWeights", () => {
  it("accumulates weight above each story and puts roof/snow on top", () => {
    const weights = computeStoryWeights(twoStory(), undefined);
    expect(weights).toHaveLength(2);
    // 最上階のみ屋根・積雪を持つ
    expect(weights[0].roofLoadN).toBe(0);
    expect(weights[0].snowLoadN).toBe(0);
    expect(weights[1].roofLoadN).toBeGreaterThan(0);
    // 内壁（間仕切り）を概算計上し、階の重量に含める
    expect(weights[0].interiorWallLoadN).toBeCloseTo(1.82 ** 2 * 400, 3);
    expect(weights[0].storyLoadN).toBeCloseTo(
      weights[0].floorLoadN +
        weights[0].wallLoadN +
        weights[0].interiorWallLoadN +
        weights[0].roofLoadN +
        weights[0].snowLoadN,
      3,
    );
    // Wi は上階＜下階
    expect(weights[0].weightAboveN).toBeGreaterThan(weights[1].weightAboveN);
    expect(weights[0].weightAboveN).toBeCloseTo(weights[0].storyLoadN + weights[1].storyLoadN, 5);
  });

  it("adds more snow in a heavy-snow region", () => {
    const tokyo = computeStoryWeights(twoStory(), { region: "東京都" });
    const niigata = computeStoryWeights(twoStory(), { region: "新潟県" });
    expect(niigata[1].snowLoadN).toBeGreaterThan(tokyo[1].snowLoadN);
  });
});

describe("computeSeismicShear", () => {
  it("uses Ci = Z * C0 and requires more wall on the lower story", () => {
    const shear = computeSeismicShear(twoStory(), { region: "東京都" });
    expect(shear[0].coefficient).toBeCloseTo(Number(STANDARD_SHEAR_COEFFICIENT));
    expect(shear[0].requiredMultiplierLengthM).toBeGreaterThan(shear[1].requiredMultiplierLengthM);
    expect(shear[0].shearN).toBeCloseTo(shear[0].coefficient * shear[0].weightAboveN);
  });
});
