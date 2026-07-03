import { ITEM_DEF_MAP } from "../../items";
import type { FloorPlan, Item, WallType } from "../../types";
import { hIndex, vIndex } from "../../floor/walls";
import { getItemSpec, type Part } from "./catalog";
import {
  CELL_CM,
  CM_TO_M,
  FLOOR_MATERIAL_KEYS,
  FLOOR_THICKNESS_CM,
  type MaterialKey,
  WALL_HEIGHT_CM,
  WALL_HEIGHT_LEFT_CM,
  WALL_THICKNESS_CM,
  WALL_THIN_THICKNESS_CM,
  WINDOW_BOTTOM_CM,
  WINDOW_TOP_CM,
} from "./config";

export interface Box3D {
  position: [number, number, number];
  size: [number, number, number];
  materialKey: MaterialKey;
}

export interface SceneModel {
  floors: Box3D[];
  walls: Box3D[];
  items: Box3D[];
  bounds: { width: number; depth: number };
}

export function buildSceneModel(floor: FloorPlan): SceneModel {
  const halfW = (floor.width * CELL_CM) / 2;
  const halfD = (floor.height * CELL_CM) / 2;
  // Cm座標(左上原点)→シーンm座標(中心原点)
  const toScene = (xCm: number, yCm: number, zCm: number): [number, number, number] => [
    (xCm - halfW) * CM_TO_M,
    yCm * CM_TO_M,
    (zCm - halfD) * CM_TO_M,
  ];
  return {
    bounds: { depth: floor.height * CELL_CM * CM_TO_M, width: floor.width * CELL_CM * CM_TO_M },
    floors: buildFloors(floor, toScene, toSize),
    items: buildItems(floor, toScene, toSize),
    walls: buildWalls(floor, toScene, toSize),
  };
}

type ToScene = (x: number, y: number, z: number) => [number, number, number];
type ToSize = (w: number, h: number, d: number) => [number, number, number];

const toSize: ToSize = (w, h, d) => [w * CM_TO_M, h * CM_TO_M, d * CM_TO_M];

function buildFloors(floor: FloorPlan, toScene: ToScene, toSize: ToSize): Box3D[] {
  const boxes: Box3D[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const cell = floor.cells[y * floor.width + x];
      if (cell.floorType === null) continue;
      boxes.push({
        materialKey: FLOOR_MATERIAL_KEYS[cell.floorType],
        position: toScene((x + 0.5) * CELL_CM, -FLOOR_THICKNESS_CM / 2, (y + 0.5) * CELL_CM),
        size: toSize(CELL_CM, FLOOR_THICKNESS_CM, CELL_CM),
      });
    }
  }
  return boxes;
}

interface WallRun {
  wallType: Exclude<WallType, "none">;
  edge: "top" | "left";
  // Top: 行z固定・x範囲、left: 列x固定・z範囲(セル単位)
  fixed: number;
  start: number;
  end: number; // Exclusive
}

function collectWallRuns(floor: FloorPlan): WallRun[] {
  const runs: WallRun[] = [];
  // Top壁 (hWalls): 行 y=0..height ごとにx方向へマージ
  for (let y = 0; y <= floor.height; y++) {
    let current: WallRun | null = null;
    for (let x = 0; x < floor.width; x++) {
      const t = floor.hWalls[hIndex(floor.width, x, y)];
      if (t === "none") {
        current = null;
      } else if (current && current.wallType === t && current.end === x) {
        current.end = x + 1;
      } else {
        current = { edge: "top", end: x + 1, fixed: y, start: x, wallType: t };
        runs.push(current);
      }
    }
  }
  // Left壁 (vWalls): 列 x=0..width ごとにz方向へマージ
  for (let x = 0; x <= floor.width; x++) {
    let current: WallRun | null = null;
    for (let y = 0; y < floor.height; y++) {
      const t = floor.vWalls[vIndex(floor.width, x, y)];
      if (t === "none") {
        current = null;
      } else if (current && current.wallType === t && current.end === y) {
        current.end = y + 1;
      } else {
        current = { edge: "left", end: y + 1, fixed: x, start: y, wallType: t };
        runs.push(current);
      }
    }
  }
  return runs;
}

interface WallLayer {
  bottom: number;
  top: number;
  materialKey: MaterialKey;
}

function wallLayers(wallType: Exclude<WallType, "none">, height: number): WallLayer[] {
  switch (wallType) {
    case "solid": {
      return [{ bottom: 0, materialKey: "wall", top: height }];
    }
    case "solid_thin": {
      return [{ bottom: 0, materialKey: "wall_thin", top: height }];
    }
    case "window_full": {
      return [{ bottom: 0, materialKey: "glass", top: height }];
    }
    case "window_center": {
      return [
        { bottom: 0, materialKey: "wall", top: WINDOW_BOTTOM_CM },
        { bottom: WINDOW_BOTTOM_CM, materialKey: "glass", top: WINDOW_TOP_CM },
        { bottom: WINDOW_TOP_CM, materialKey: "wall", top: height },
      ];
    }
  }
}

function buildWalls(floor: FloorPlan, toScene: ToScene, toSize: ToSize): Box3D[] {
  const boxes: Box3D[] = [];
  for (const run of collectWallRuns(floor)) {
    const thickness = run.wallType === "solid_thin" ? WALL_THIN_THICKNESS_CM : WALL_THICKNESS_CM;
    const height = run.edge === "top" ? WALL_HEIGHT_CM : WALL_HEIGHT_LEFT_CM;
    const length = (run.end - run.start) * CELL_CM + thickness; // 両端t/2延長で角を閉じる
    const center = ((run.start + run.end) / 2) * CELL_CM;
    for (const layer of wallLayers(run.wallType, height)) {
      const h = layer.top - layer.bottom;
      const cy = layer.bottom + h / 2;
      if (run.edge === "top") {
        boxes.push({
          materialKey: layer.materialKey,
          position: toScene(center, cy, run.fixed * CELL_CM),
          size: toSize(length, h, thickness),
        });
      } else {
        boxes.push({
          materialKey: layer.materialKey,
          position: toScene(run.fixed * CELL_CM, cy, center),
          size: toSize(thickness, h, length),
        });
      }
    }
  }
  return boxes;
}

function getItemDrawOffset(
  w: number,
  h: number,
  rotation: Item["rotation"],
): { offX: number; offY: number; effectiveW: number; effectiveH: number } {
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveW = isRotated ? h : w;
  const effectiveH = isRotated ? w : h;
  const asymmetric = w !== h;
  const offX = asymmetric && rotation === 90 && effectiveW > 1 ? -(effectiveW - 1) : 0;
  const offY = asymmetric && rotation === 180 && effectiveH > 1 ? -(effectiveH - 1) : 0;
  return { effectiveH, effectiveW, offX, offY };
}

function rotatePart(part: Part, rotation: Item["rotation"]): Part {
  const [w, h, d] = part.size;
  const [ox, oy, oz] = part.offset;
  switch (rotation) {
    case 0: {
      return part;
    }
    case 90: {
      return { materialKey: part.materialKey, offset: [oz, oy, -ox], size: [d, h, w] };
    }
    case 180: {
      return { materialKey: part.materialKey, offset: [-ox, oy, -oz], size: [w, h, d] };
    }
    case 270: {
      return { materialKey: part.materialKey, offset: [-oz, oy, ox], size: [d, h, w] };
    }
  }
}

function buildItems(floor: FloorPlan, toScene: ToScene, toSize: ToSize): Box3D[] {
  const boxes: Box3D[] = [];
  const visited = new Set<number>();
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const idx = y * floor.width + x;
      if (visited.has(idx)) continue;
      const cell = floor.cells[idx];
      if (!cell.item) continue;
      const def = ITEM_DEF_MAP.get(cell.item.type);
      if (!def) continue;
      const { effectiveW, effectiveH, offX, offY } = getItemDrawOffset(
        def.w,
        def.h,
        cell.item.rotation,
      );
      for (let dy = 0; dy < effectiveH; dy++) {
        for (let dx = 0; dx < effectiveW; dx++) {
          const cx = x + dx;
          const cy = y + dy;
          if (cx < floor.width && cy < floor.height) visited.add(cy * floor.width + cx);
        }
      }
      const drawX = x + offX;
      const drawY = y + offY;
      // グリッド外へはみ出す占有分はクランプ対象から除外し、実際に見える範囲へ収める
      const availW = Math.min(effectiveW, floor.width - drawX) * CELL_CM;
      const availD = Math.min(effectiveH, floor.height - drawY) * CELL_CM;
      const centerX = (drawX + Math.min(effectiveW, floor.width - drawX) / 2) * CELL_CM;
      const centerZ = (drawY + Math.min(effectiveH, floor.height - drawY) / 2) * CELL_CM;
      const spec = getItemSpec(cell.item.type);
      const rot = cell.item.rotation;
      const isRotated = rot === 90 || rot === 270;
      const fpW = isRotated ? spec.footprint.d : spec.footprint.w;
      const fpD = isRotated ? spec.footprint.w : spec.footprint.d;
      const scale = Math.min(1, availW / fpW, availD / fpD);
      for (const rawPart of spec.parts) {
        const part = rotatePart(rawPart, rot);
        const [w, h, d] = part.size;
        boxes.push({
          materialKey: part.materialKey,
          position: toScene(
            centerX + part.offset[0] * scale,
            part.offset[1] + h / 2,
            centerZ + part.offset[2] * scale,
          ),
          size: toSize(w * scale, h, d * scale),
        });
      }
    }
  }
  return boxes;
}
