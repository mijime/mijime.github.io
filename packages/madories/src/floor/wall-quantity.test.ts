import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { setWallsPure } from "./walls";
import { computeInterFloorWallBalance, computeWallQuantity, suggestWallRun } from "./wall-quantity";
import type { FloorPlan } from "../types";

export function encloseRect(
  floor: FloorPlan,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): FloorPlan {
  const edges: { kind: "h" | "v"; x: number; y: number }[] = [];
  for (let x = x1; x <= x2; x++) {
    edges.push({ kind: "h", x, y: y1 }, { kind: "h", x, y: y2 + 1 });
  }
  for (let y = y1; y <= y2; y++) {
    edges.push({ kind: "v", x: x1, y }, { kind: "v", x: x2 + 1, y });
  }
  return setWallsPure(floor, edges, "solid");
}

describe("computeWallQuantity", () => {
  it("reports measured shear wall length in both directions", () => {
    const floor = encloseRect(createFloorPlan("test", 6, 6), 1, 1, 4, 4);
    const q = computeWallQuantity(floor);
    expect(q.areaM2).toBeGreaterThan(0);
    expect(q.haveHm).toBeGreaterThan(0);
    expect(q.haveVm).toBeGreaterThan(0);
  });

  it("reports zero for an empty floor", () => {
    const q = computeWallQuantity(createFloorPlan("test", 6, 6));
    expect(q.areaM2).toBe(0);
    expect(q.haveHm).toBe(0);
    expect(q.haveVm).toBe(0);
  });

  it("treats a floor with no structural wall as NG, not a vacuous OK", () => {
    const q = computeWallQuantity(createFloorPlan("test", 6, 6));
    expect(q.okH).toBe(false);
    expect(q.okV).toBe(false);
  });
});

describe("suggestWallRun", () => {
  it("finds an open slot for a missing horizontal wall in a quadrant", () => {
    // A 4x4 solid-walled room with an open interior.
    const floor = encloseRect(createFloorPlan("test", 6, 6), 1, 1, 4, 4);
    const suggestion = suggestWallRun(floor, "NW", "h");
    expect(suggestion).not.toBeNull();
    expect(suggestion!.cells).toBeGreaterThanOrEqual(2);
    expect(suggestion!.kind).toBe("h");
    // Suggested edges are on open ("none") slots.
    for (const e of suggestion!.edges) {
      expect(floor.hWalls[e.y * floor.width + e.x]).toBe("none");
    }
  });

  it("returns null when no open slot with enough length exists", () => {
    const floor = createFloorPlan("test", 4, 4);
    const suggestion = suggestWallRun(floor, "NW", "h");
    expect(suggestion).toBeNull();
  });
});

describe("computeInterFloorWallBalance", () => {
  it("flags a lower floor with less shear wall than the floor above", () => {
    const lower = encloseRect(createFloorPlan("t", 8, 8), 1, 1, 2, 2); // Small (weak)
    const upper = encloseRect(createFloorPlan("t", 8, 8), 1, 1, 5, 5); // Large (strong)
    const [bal] = computeInterFloorWallBalance([lower, upper]);
    expect(bal.ok).toBe(false);
    expect(bal.hDeficit).toBeGreaterThan(0);
    expect(bal.vDeficit).toBeGreaterThan(0);
  });

  it("passes when the lower floor carries at least as much wall", () => {
    const lower = encloseRect(createFloorPlan("t", 8, 8), 1, 1, 5, 5); // Strong
    const upper = encloseRect(createFloorPlan("t", 8, 8), 1, 1, 2, 2); // Weak
    const [bal] = computeInterFloorWallBalance([lower, upper]);
    expect(bal.ok).toBe(true);
    expect(bal.hDeficit).toBeLessThan(0);
    expect(bal.vDeficit).toBeLessThan(0);
  });

  it("returns nothing for a single floor", () => {
    expect(computeInterFloorWallBalance([createFloorPlan("t", 6, 6)])).toEqual([]);
  });
});
