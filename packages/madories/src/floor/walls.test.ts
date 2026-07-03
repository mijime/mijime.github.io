import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { getWall, hIndex, rotateFloorCW90, setWallsPure, vIndex } from "./walls";

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
});
