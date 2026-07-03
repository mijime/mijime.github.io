import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../../store";
import { hIndex, vIndex } from "../../floor/walls";
import { CELL_CM, CM_TO_M } from "./config";
import { buildSceneModel } from "./scene-model";

const CELL_M = CELL_CM * CM_TO_M;

describe("buildSceneModel", () => {
  it("generates one floor box per non-null cell, top surface at y=0", () => {
    const floor = createFloorPlan("test", 2, 1);
    floor.cells[0].floorType = "wood";
    const model = buildSceneModel(floor);
    expect(model.floors).toHaveLength(1);
    const box = model.floors[0];
    expect(box.materialKey).toBe("floor_wood");
    expect(box.size[0]).toBeCloseTo(CELL_M);
    // 2x1グリッドの左セル中心 = x: -CELL_M/2
    expect(box.position[0]).toBeCloseTo(-CELL_M / 2);
    expect(box.position[1] + box.size[1] / 2).toBeCloseTo(0);
  });

  it("computes bounds from grid size", () => {
    const model = buildSceneModel(createFloorPlan("test", 3, 2));
    expect(model.bounds.width).toBeCloseTo(3 * CELL_M);
    expect(model.bounds.depth).toBeCloseTo(2 * CELL_M);
  });

  it("merges consecutive solid walls in a row into one box", () => {
    const floor = createFloorPlan("test", 3, 1);
    floor.hWalls[hIndex(3, 0, 0)] = "solid";
    floor.hWalls[hIndex(3, 1, 0)] = "solid";
    floor.hWalls[hIndex(3, 2, 0)] = "solid";
    const model = buildSceneModel(floor);
    expect(model.walls).toHaveLength(1);
    // 3セル分 + 両端厚さ/2延長
    expect(model.walls[0].size[0]).toBeCloseTo(3 * CELL_M + 9 * CM_TO_M);
    expect(model.walls[0].materialKey).toBe("wall");
  });

  it("does not merge walls of different types", () => {
    const floor = createFloorPlan("test", 2, 1);
    floor.hWalls[hIndex(2, 0, 0)] = "solid";
    floor.hWalls[hIndex(2, 1, 0)] = "solid_thin";
    const model = buildSceneModel(floor);
    expect(model.walls).toHaveLength(2);
  });

  it("splits window_center into wall/glass/wall vertically", () => {
    const floor = createFloorPlan("test", 1, 1);
    floor.hWalls[hIndex(1, 0, 0)] = "window_center";
    const model = buildSceneModel(floor);
    expect(model.walls).toHaveLength(3);
    // eslint-disable-next-line unicorn/no-array-sort -- toSorted requires ES2023 lib not configured in this project
    const keys = model.walls.map((w) => w.materialKey).sort();
    expect(keys).toEqual(["glass", "wall", "wall"]);
    const glass = model.walls.find((w) => w.materialKey === "glass")!;
    // Glass: 90cm〜200cm → 中心145cm、高さ110cm
    expect(glass.position[1]).toBeCloseTo(1.45);
    expect(glass.size[1]).toBeCloseTo(1.1);
  });

  it("renders a multi-cell item exactly once", () => {
    const floor = createFloorPlan("test", 1, 2);
    floor.cells[0].item = { rotation: 0, type: "bed_single" };
    floor.cells[1].item = { rotation: 0, type: "bed_single" };
    const model = buildSceneModel(floor);
    // Bed_singleのパーツ数 = 3(フレーム+マットレス+枕)
    expect(model.items).toHaveLength(3);
  });

  it("swaps footprint axes when rotated 90 degrees", () => {
    const floor = createFloorPlan("test", 2, 2);
    floor.cells[0].item = { rotation: 90, type: "bathtub" };
    const model = buildSceneModel(floor);
    const tub = model.items[0];
    // Bathtub本体 75x160(d) → 90度回転でx方向が160側になる
    expect(tub.size[0]).toBeGreaterThan(tub.size[2]);
  });

  it("clamps oversized footprints into the occupied cells keeping height", () => {
    const floor = createFloorPlan("test", 1, 1);
    floor.cells[0].item = { rotation: 0, type: "washbasin_large" };
    const model = buildSceneModel(floor);
    for (const box of model.items) {
      expect(box.position[2] + box.size[2] / 2).toBeLessThanOrEqual(CELL_M / 2 + 1e-6);
      expect(box.position[2] - box.size[2] / 2).toBeGreaterThanOrEqual(-CELL_M / 2 - 1e-6);
    }
  });

  it("includes boundary walls (bottom and right edges)", () => {
    const floor = createFloorPlan("test", 2, 2);
    // Bottom boundary wall (y=height)
    floor.hWalls[hIndex(floor.width, 0, floor.height)] = "solid";
    // Right boundary wall (x=width)
    floor.vWalls[vIndex(floor.width, floor.width, 0)] = "solid";
    const model = buildSceneModel(floor);
    // Both walls should produce boxes: 1 hWall + 1 vWall
    expect(model.walls).toHaveLength(2);
  });
});
