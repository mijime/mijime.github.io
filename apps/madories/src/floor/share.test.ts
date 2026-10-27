import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { setWallsPure } from "./walls";
import { contentBounds } from "./frame";
import type { FloorPlan } from "../types";
import { decodeFloors, encodeFloors, floorsToText, textToFloors } from "./share";

/** 外周壁だけの矩形フロアを作る(コンテンツ = その矩形)。 */
function rectFloor(name: string, x1: number, y1: number, x2: number, y2: number): FloorPlan {
  const edges = [];
  for (let x = x1; x <= x2; x++) {
    edges.push({ kind: "h" as const, x, y: y1 }, { kind: "h" as const, x, y: y2 + 1 });
  }
  for (let y = y1; y <= y2; y++) {
    edges.push({ kind: "v" as const, x: x1, y }, { kind: "v" as const, x: x2 + 1, y });
  }
  return setWallsPure(createFloorPlan(name), edges, "solid");
}

describe("share roundtrip", () => {
  it("encodes and decodes a 40x40 floor with content", async () => {
    let floor = createFloorPlan("1F");
    const edges = [];
    for (let x = 4; x < 36; x++) {
      edges.push({ kind: "h" as const, x, y: 4 }, { kind: "h" as const, x, y: 35 });
    }
    for (let y = 4; y < 36; y++) {
      edges.push({ kind: "v" as const, x: 4, y }, { kind: "v" as const, x: 36, y });
    }
    floor = setWallsPure(floor, edges, "solid");
    for (let y = 5; y < 35; y++) {
      for (let x = 5; x < 35; x++) {
        floor.cells[y * 40 + x] = { floorType: "wood", item: null };
      }
    }
    const text = floorsToText([floor]);
    const encoded = await encodeFloors([floor]);
    const decoded = await decodeFloors(encoded);
    expect(decoded).toHaveLength(1);
    // DSL normalizes to the content bbox (3,3)-(36,35) → 34x33.
    expect(decoded[0].width).toBe(34);
    expect(decoded[0].height).toBe(33);
    expect(decoded[0].cells[2 * 34 + 2].floorType).toBe("wood");
    expect(textToFloors(text)[0].width).toBe(34);
  });

  it("階ごとのワールド位置(origin)を保つ = 上下階がズレない", async () => {
    // 1Fの外形 (2,2)-(12,10)、2Fは (5,3)-(15,11) にずらして置く
    const f1 = rectFloor("1F", 2, 2, 12, 10);
    const f2 = rectFloor("2F", 5, 3, 15, 11);
    const source = [contentBounds(f1), contentBounds(f2)];
    if (!source[0] || !source[1]) {
      throw new Error("テストデータのコンテンツが無い");
    }

    const decoded = await decodeFloors(await encodeFloors([f1, f2]));
    const restored = [contentBounds(decoded[0]), contentBounds(decoded[1])];
    // 各階のワールド位置が元と完全に一致する
    expect(restored).toEqual(source);
    // 階間の相対オフセットも一致する(階段が上下で揃う条件)
    expect(restored[1]!.minX - restored[0]!.minX).toBe(source[1]!.minX - source[0]!.minX);
    expect(restored[1]!.minY - restored[0]!.minY).toBe(source[1]!.minY - source[0]!.minY);
    // 前提: 2つの階はズラして置かれている(ズレが無いとテストにならない)
    expect(source[1]!.minX - source[0]!.minX).not.toBe(0);
    expect(source[1]!.minY - source[0]!.minY).not.toBe(0);
  });

  it("origin 行が無いDSLは原点(0,0)として読む(後方互換)", () => {
    const floors = textToFloors('size 3 3\nname "1F"\nwall (0,0)-(2,0) top solid');
    expect([floors[0].originX, floors[0].originY]).toEqual([0, 0]);
  });
});
