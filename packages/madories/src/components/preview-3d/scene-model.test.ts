import { describe, expect, it } from "vitest";
import type { Cell, FloorPlan } from "../../types";
import { CELL_CM, CM_TO_M } from "./config";
import { buildSceneModel } from "./scene-model";

function emptyCell(): Cell {
  return { floorType: null, item: null, wall: { left: "none", top: "none" } };
}

function makeFloor(width: number, height: number, mutate?: (cells: Cell[]) => void): FloorPlan {
  const cells = Array.from({ length: width * height }, emptyCell);
  mutate?.(cells);
  return { cells, height, id: "f1", name: "test", width };
}

const CELL_M = CELL_CM * CM_TO_M;

describe("buildSceneModel", () => {
  it("generates one floor box per non-null cell, top surface at y=0", () => {
    const floor = makeFloor(2, 1, (cells) => {
      cells[0].floorType = "wood";
    });
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
    const model = buildSceneModel(makeFloor(3, 2));
    expect(model.bounds.width).toBeCloseTo(3 * CELL_M);
    expect(model.bounds.depth).toBeCloseTo(2 * CELL_M);
  });

  it("merges consecutive solid walls in a row into one box", () => {
    const floor = makeFloor(3, 1, (cells) => {
      cells[0].wall.top = "solid";
      cells[1].wall.top = "solid";
      cells[2].wall.top = "solid";
    });
    const model = buildSceneModel(floor);
    expect(model.walls).toHaveLength(1);
    // 3セル分 + 両端厚さ/2延長
    expect(model.walls[0].size[0]).toBeCloseTo(3 * CELL_M + 9 * CM_TO_M);
    expect(model.walls[0].materialKey).toBe("wall");
  });

  it("does not merge walls of different types", () => {
    const floor = makeFloor(2, 1, (cells) => {
      cells[0].wall.top = "solid";
      cells[1].wall.top = "solid_thin";
    });
    const model = buildSceneModel(floor);
    expect(model.walls).toHaveLength(2);
  });

  it("splits window_center into wall/glass/wall vertically", () => {
    const floor = makeFloor(1, 1, (cells) => {
      cells[0].wall.top = "window_center";
    });
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
    const floor = makeFloor(1, 2, (cells) => {
      // Bed_single は w=1,h=2 の2セル占有。両セルに同じitemが入っている状態
      cells[0].item = { rotation: 0, type: "bed_single" };
      cells[1].item = { rotation: 0, type: "bed_single" };
    });
    const model = buildSceneModel(floor);
    // Bed_singleのパーツ数 = 3(フレーム+マットレス+枕)
    expect(model.items).toHaveLength(3);
  });

  it("swaps footprint axes when rotated 90 degrees", () => {
    const floor = makeFloor(2, 2, (cells) => {
      cells[0].item = { rotation: 90, type: "bathtub" };
    });
    const model = buildSceneModel(floor);
    const tub = model.items[0];
    // Bathtub本体 75x160(d) → 90度回転でx方向が160側になる
    expect(tub.size[0]).toBeGreaterThan(tub.size[2]);
  });

  it("clamps oversized footprints into the occupied cells keeping height", () => {
    const floor = makeFloor(1, 1, (cells) => {
      // Washbasin_large は h=2 だが1x1グリッドに置く → 占有可能は1セルのみ、d=165cm > 91cm
      cells[0].item = { rotation: 0, type: "washbasin_large" };
    });
    const model = buildSceneModel(floor);
    for (const box of model.items) {
      expect(box.position[2] + box.size[2] / 2).toBeLessThanOrEqual(CELL_M / 2 + 1e-6);
      expect(box.position[2] - box.size[2] / 2).toBeGreaterThanOrEqual(-CELL_M / 2 - 1e-6);
    }
  });
});
