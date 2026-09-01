import type { Box3D } from "./scene-model";

export interface WallCollider {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

// 衝突対象: 本壁(solid)と窓ガラス。開口部(solid_thin=wall_thin)は通り抜け可
const BLOCKING_MATERIALS = new Set(["wall", "glass"]);

/**
 * 3D壁ボックス(シーンm座標・中心原点)から、XZ平面で衝突判定に使うAABB一覧を構築する。
 * 高い方を避けるため、天井方向の高さは考慮せず水平(2D)衝突のみ扱う。
 */
export function buildWallColliders(walls: Box3D[]): WallCollider[] {
  const out: WallCollider[] = [];
  for (const w of walls) {
    if (!BLOCKING_MATERIALS.has(w.materialKey)) continue;
    out.push({
      minX: w.position[0] - w.size[0] / 2,
      maxX: w.position[0] + w.size[0] / 2,
      minZ: w.position[2] - w.size[2] / 2,
      maxZ: w.position[2] + w.size[2] / 2,
    });
  }
  return out;
}

function overlaps(x: number, z: number, r: number, c: WallCollider): boolean {
  return x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ;
}

// 1サブステップ辺りの最大移動量(m)。これを超える移動は分割して壁の飛び越しを防ぐ
const MAX_SUB_STEP = 0.05;

/**
 * プレイヤーを半径rの円としてXZ平面を動かし、壁に埋まらないよう衝突を解決する。
 * 各軸ごとに移動量を小ステップに分割して壁面にクランプする(高速移動でも飛び越さない)。
 */
export function resolveCollision(
  pos: { x: number; z: number },
  dx: number,
  dz: number,
  r: number,
  colliders: WallCollider[],
): { x: number; z: number } {
  const maxAbs = Math.max(Math.abs(dx), Math.abs(dz));
  const steps = Math.max(1, Math.ceil(maxAbs / MAX_SUB_STEP));
  const sx = dx / steps;
  const sz = dz / steps;
  let x = pos.x;
  let z = pos.z;
  for (let i = 0; i < steps; i++) {
    x += sx;
    for (const c of colliders) {
      if (!overlaps(x, z, r, c)) continue;
      if (sx > 0) x = c.minX - r;
      else if (sx < 0) x = c.maxX + r;
    }
    z += sz;
    for (const c of colliders) {
      if (!overlaps(x, z, r, c)) continue;
      if (sz > 0) z = c.minZ - r;
      else if (sz < 0) z = c.maxZ + r;
    }
  }
  return { x, z };
}
