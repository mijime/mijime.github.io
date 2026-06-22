import { describe, expect, it } from "vitest";
import { computeCenterOnNode } from "./view";

describe("computeCenterOnNode", () => {
  it("returns pan (0, 0) and preserves zoom when node is at origin", () => {
    const result = computeCenterOnNode({ x: 0, y: 0 }, 1);
    expect(result.pan.x).toBeCloseTo(0, 10);
    expect(result.pan.y).toBeCloseTo(0, 10);
    expect(result.zoom).toBe(1);
  });

  it("returns correct pan for a node at (100, 50) at zoom 1", () => {
    const result = computeCenterOnNode({ x: 100, y: 50 }, 1);
    expect(result.pan).toEqual({ x: -100, y: -50 });
    expect(result.zoom).toBe(1);
  });

  it("scales pan by zoom for a node at (100, 50) at zoom 2", () => {
    const result = computeCenterOnNode({ x: 100, y: 50 }, 2);
    expect(result.pan).toEqual({ x: -200, y: -100 });
    expect(result.zoom).toBe(2);
  });
});
