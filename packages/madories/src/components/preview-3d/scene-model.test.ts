import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../../store";
import { hIndex, vIndex } from "../../floor/walls";
import { CELL_CM, CM_TO_M, WALL_HEIGHT_CM } from "./config";
import { buildBuildingScene, buildSceneModel } from "./scene-model";

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

  it("faces chair back toward +z at rotation 0, matching 2D icon", () => {
    const floor = createFloorPlan("test", 1, 1);
    floor.cells[0].item = { rotation: 0, type: "chair" };
    const model = buildSceneModel(floor);
    const back = model.items.find((b) => b.materialKey === "fabric_dark")!;
    expect(back.position[2]).toBeGreaterThan(0);
  });

  it("rotates clockwise like the 2D canvas (chair back moves to -x at 90deg)", () => {
    const floor = createFloorPlan("test", 1, 1);
    floor.cells[0].item = { rotation: 90, type: "chair" };
    const model = buildSceneModel(floor);
    const back = model.items.find((b) => b.materialKey === "fabric_dark")!;
    expect(back.position[0]).toBeLessThan(0);
    expect(back.position[2]).toBeCloseTo(0);
  });

  it("places door panel at the left cell edge at rotation 0", () => {
    const floor = createFloorPlan("test", 1, 1);
    floor.cells[0].item = { rotation: 0, type: "door" };
    const model = buildSceneModel(floor);
    const panel = model.items[0];
    // 2Dアイコンの閉扉位置(左端)に合わせ、パネル外面がセル左端 x=-CELL_M/2 に接する
    expect(panel.position[0] - panel.size[0] / 2).toBeCloseTo(-CELL_M / 2);
    expect(panel.size[0]).toBeLessThan(panel.size[2]);
  });

  it("places sliding door panel at the top cell edge at rotation 0", () => {
    const floor = createFloorPlan("test", 1, 1);
    floor.cells[0].item = { rotation: 0, type: "door_slide" };
    const model = buildSceneModel(floor);
    const panel = model.items[0];
    // 2Dアイコン(上端レール)に合わせ、パネル外面がセル上端 z=-CELL_M/2 に接する
    expect(panel.position[2] - panel.size[2] / 2).toBeCloseTo(-CELL_M / 2);
    expect(panel.size[2]).toBeLessThan(panel.size[0]);
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

  it("offsets a floor upward by yOffsetCm when stacking", () => {
    const floor = createFloorPlan("test", 1, 1);
    floor.cells[0].floorType = "wood";
    const base = buildSceneModel(floor);
    const up = buildSceneModel(floor, WALL_HEIGHT_CM);
    // 2F床スラブ上面は1F壁天面(y=WALL_HEIGHT)に乗る
    expect(up.floors[0].position[1] + up.floors[0].size[1] / 2).toBeCloseTo(
      WALL_HEIGHT_CM * CM_TO_M,
    );
    // Xz平面の位置は変わらない
    expect(up.floors[0].position[0]).toBeCloseTo(base.floors[0].position[0]);
    expect(up.floors[0].position[2]).toBeCloseTo(base.floors[0].position[2]);
  });

  it("buildBuildingScene stacks all floors and merges bounds", () => {
    const f1 = createFloorPlan("f1", 2, 1);
    f1.cells[0].floorType = "wood"; // 1F床
    const f2 = createFloorPlan("f2", 4, 2);
    f2.cells[0].floorType = "wood"; // 2F床
    const model = buildBuildingScene([f1, f2]);
    // 全体boundsは最大階の平面サイズ(4x2)
    expect(model.bounds.width).toBeCloseTo(4 * CELL_M);
    expect(model.bounds.depth).toBeCloseTo(2 * CELL_M);
    // 2枚分の床スラブがマージされている
    expect(model.floors.length).toBe(2);
    // 2F床スラブ上面は1F壁天面(y=WALL_HEIGHT)に乗る
    const topFloor = model.floors.at(-1)!;
    expect(topFloor.position[1] + topFloor.size[1] / 2).toBeCloseTo(WALL_HEIGHT_CM * CM_TO_M);
    expect(topFloor.position[1]).toBeGreaterThan(model.floors[0].position[1]);
  });
});
