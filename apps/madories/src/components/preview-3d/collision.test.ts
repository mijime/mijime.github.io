import { describe, expect, it } from "vitest";
import { buildWallColliders, resolveCollision } from "./collision";
import type { MaterialKey } from "./config";
import type { Box3D } from "./scene-model";

function wallBox(
  px: number,
  pz: number,
  sx: number,
  sz: number,
  materialKey: MaterialKey = "wall",
): Box3D {
  return { materialKey, position: [px, 1.2, pz], size: [sx, 2.4, sz] };
}

describe("buildWallColliders", () => {
  it("keeps only blocking materials (wall / glass)", () => {
    const walls = [
      wallBox(0, 0, 1, 1, "wall"),
      wallBox(2, 0, 1, 1, "wall_thin"), // 開口部は通れる→除外
      wallBox(4, 0, 1, 1, "wood"), // 家具は除外
      wallBox(6, 0, 1, 1, "glass"),
    ];
    expect(buildWallColliders(walls).map((c) => [c.minX, c.maxX])).toEqual([
      [-0.5, 0.5],
      [5.5, 6.5],
    ]);
  });
});

describe("resolveCollision", () => {
  const wall: Box3D = wallBox(0, 0, 1, 1);
  const colliders = buildWallColliders([wall]);

  it("moves freely when clear of the wall", () => {
    const out = resolveCollision({ x: -5, z: -5 }, 0.2, 0.1, 0.35, colliders);
    expect(out.x).toBeCloseTo(-4.8);
    expect(out.z).toBeCloseTo(-4.9);
  });

  it("clamps forward+ into the wall face instead of passing through", () => {
    // 壁は x in [-0.5,0.5], z in [-0.5,0.5]。前方(z-)へ進み壁に当たる
    const out = resolveCollision({ x: 0, z: 2 }, 0, -10, 0.35, colliders);
    // 壁の+z側面(z=0.5)で止まる → 中心 = 面 + r = 0.5 + 0.35
    expect(out.z).toBeCloseTo(0.85);
  });

  it("clamps lateral move into the wall face", () => {
    const out = resolveCollision({ x: -5, z: 0 }, 10, 0, 0.35, colliders);
    // 壁の-x側面(x=-0.5)で止まる → 中心 = 面 - r = -0.5 - 0.35
    expect(out.x).toBeCloseTo(-0.85);
  });

  it("keeps the other axis free when the moving axis is clamped", () => {
    // 壁際(x=-0.85, 壁の-x面から半径分)からz方向に動く → zだけ進みxは動かず壁に沿う
    const out = resolveCollision({ x: -0.85, z: 0 }, 0, 3, 0.35, colliders);
    expect(out.x).toBeCloseTo(-0.85);
    expect(out.z).toBeCloseTo(3);
  });
});
