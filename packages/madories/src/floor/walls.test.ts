import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import {
  flipFloorH,
  flipFloorV,
  getWall,
  hIndex,
  rotateFloorCW90,
  setWallsPure,
  vIndex,
} from "./walls";

describe("walls", () => {
  it("indexes h/v walls", () => {
    expect(hIndex(4, 2, 3)).toBe(3 * 4 + 2);
    expect(vIndex(4, 4, 1)).toBe(1 * 5 + 4);
  });

  it("sets and gets walls including right/bottom boundary", () => {
    let floor = createFloorPlan("t", 3, 2);
    floor = setWallsPure(floor, [{ kind: "h", x: 1, y: 2 }], "solid"); // 下端
    floor = setWallsPure(floor, [{ kind: "v", x: 3, y: 0 }], "window_full"); // 右端
    expect(getWall(floor, { kind: "h", x: 1, y: 2 })).toBe("solid");
    expect(getWall(floor, { kind: "v", x: 3, y: 0 })).toBe("window_full");
  });

  it("rotateFloorCW90 maps left wall to top wall", () => {
    let floor = createFloorPlan("t", 3, 2);
    floor = setWallsPure(floor, [{ kind: "v", x: 1, y: 0 }], "solid");
    const r = rotateFloorCW90(floor);
    // 頂点写像 (vx,vy)→(h-vy,vx): (1,0)-(1,1) → (2,1)-(1,1) = h エッジ (1,1)
    expect(r.width).toBe(2);
    expect(r.height).toBe(3);
    expect(getWall(r, { kind: "h", x: 1, y: 1 })).toBe("solid");
  });

  it("rotateFloorCW90 preserves top-row walls (old bug)", () => {
    let floor = createFloorPlan("t", 3, 2);
    floor = setWallsPure(floor, [{ kind: "h", x: 0, y: 0 }], "solid");
    const r = rotateFloorCW90(floor);
    // (0,0)-(1,0) → (2,0)-(2,1) = v エッジ x=2(右端)。旧実装ではここで消えていた
    expect(getWall(r, { kind: "v", x: 2, y: 0 })).toBe("solid");
  });

  it("four rotations are identity", () => {
    let floor = createFloorPlan("t", 4, 3);
    floor = setWallsPure(
      floor,
      [
        { kind: "h", x: 0, y: 0 },
        { kind: "h", x: 2, y: 3 },
        { kind: "v", x: 4, y: 1 },
        { kind: "v", x: 1, y: 2 },
      ],
      "solid",
    );
    floor.cells[5] = { floorType: "wood", item: { rotation: 90, type: "sofa" } };
    let r = floor;
    for (let i = 0; i < 4; i++) r = rotateFloorCW90(r);
    expect(r.hWalls).toEqual(floor.hWalls);
    expect(r.vWalls).toEqual(floor.vWalls);
    expect(r.cells).toEqual(floor.cells);
  });

  it("flipFloorH mirrors cells and walls left-right", () => {
    let floor = createFloorPlan("t", 4, 3);
    floor = setWallsPure(
      floor,
      [
        { kind: "h", x: 0, y: 1 },
        { kind: "v", x: 1, y: 0 },
      ],
      "solid",
    );
    floor.cells[1 * 4 + 0] = { floorType: "wood", item: { rotation: 90, type: "chair" } };
    const f = flipFloorH(floor);
    expect(f.width).toBe(4);
    expect(f.height).toBe(3);
    // H(0,1) → h(3,1)、v(1,0) → v(3,0)
    expect(getWall(f, { kind: "h", x: 3, y: 1 })).toBe("solid");
    expect(getWall(f, { kind: "v", x: 3, y: 0 })).toBe("solid");
    expect(getWall(f, { kind: "h", x: 0, y: 1 })).toBe("none");
    // Chair 2x2 at (0,1) → 占有域写像で (2,1)、回転90 → 270
    // 床材は単セル写像で (3,1) へ(家具とは別々に動く)
    expect(f.cells[1 * 4 + 3].floorType).toBe("wood");
    expect(f.cells[1 * 4 + 2].item).toEqual({ rotation: 270, type: "chair" });
    expect(f.cells[1 * 4 + 3].item).toBeNull();
  });

  it("flipFloorV mirrors cells and walls top-bottom", () => {
    let floor = createFloorPlan("t", 4, 3);
    floor = setWallsPure(
      floor,
      [
        { kind: "h", x: 1, y: 0 },
        { kind: "v", x: 2, y: 2 },
      ],
      "solid",
    );
    floor.cells[1] = { floorType: "wood", item: { rotation: 0, type: "chair" } };
    const f = flipFloorV(floor);
    // H(1,0) → h(1,3)、v(2,2) → v(2,0)
    expect(getWall(f, { kind: "h", x: 1, y: 3 })).toBe("solid");
    expect(getWall(f, { kind: "v", x: 2, y: 0 })).toBe("solid");
    // Chair 2x2 at (1,0) → 占有域写像で (1,1)、回転0 → 180
    // 床材は単セル写像で (1,2) へ(家具とは別々に動く)
    expect(f.cells[2 * 4 + 1].floorType).toBe("wood");
    expect(f.cells[1 * 4 + 1].item).toEqual({ rotation: 180, type: "chair" });
    expect(f.cells[2 * 4 + 1].item).toBeNull();
  });

  it("double flip is identity and H+V equals 180 rotation", () => {
    let floor = createFloorPlan("t", 5, 4);
    floor = setWallsPure(
      floor,
      [
        { kind: "h", x: 0, y: 0 },
        { kind: "h", x: 3, y: 4 },
        { kind: "v", x: 5, y: 1 },
        { kind: "v", x: 1, y: 2 },
      ],
      "solid",
    );
    floor.cells[6] = { floorType: "wood", item: { rotation: 90, type: "sofa" } };
    const hh = flipFloorH(flipFloorH(floor));
    expect(hh.hWalls).toEqual(floor.hWalls);
    expect(hh.vWalls).toEqual(floor.vWalls);
    expect(hh.cells).toEqual(floor.cells);
    const vv = flipFloorV(flipFloorV(floor));
    expect(vv.cells).toEqual(floor.cells);
    // H+V = 180度回転と等価
    const hv = flipFloorV(flipFloorH(floor));
    const r180 = rotateFloorCW90(rotateFloorCW90(floor));
    expect(hv.hWalls).toEqual(r180.hWalls);
    expect(hv.vWalls).toEqual(r180.vWalls);
    expect(hv.cells).toEqual(r180.cells);
  });

  it("rotateFloorCW90 moves asymmetric items by footprint, not by anchor cell", () => {
    // Kitchen 2x6 at (2,1) occupies cols 2..3, rows 1..6.
    // CW90 maps the region to cols 1..6, rows 2..3 → anchor (1,2), rotation 90.
    const floor = createFloorPlan("t", 8, 8);
    floor.cells[1 * 8 + 2] = { floorType: "wood", item: { rotation: 0, type: "kitchen" } };
    const r = rotateFloorCW90(floor);
    expect(r.width).toBe(8);
    expect(r.height).toBe(8);
    expect(r.cells[2 * 8 + 1].item).toEqual({ rotation: 90, type: "kitchen" });
    // 旧アンカーの回転先 (6,2) には床材だけ残り、家具はない
    expect(r.cells[2 * 8 + 6].floorType).toBe("wood");
    expect(r.cells[2 * 8 + 6].item).toBeNull();
  });

  it("four rotations preserve asymmetric item footprints", () => {
    const floor = createFloorPlan("t", 8, 8);
    floor.cells[1 * 8 + 2] = { floorType: "wood", item: { rotation: 0, type: "kitchen" } };
    let r = floor;
    for (let i = 0; i < 4; i++) r = rotateFloorCW90(r);
    expect(r.cells).toEqual(floor.cells);
  });
});
