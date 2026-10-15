import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { setWallsPure } from "./walls";
import { suggestWallRun } from "./wall-quantity";
import type { FloorPlan } from "../types";

function encloseRect(floor: FloorPlan, x1: number, y1: number, x2: number, y2: number): FloorPlan {
  const edges: { kind: "h" | "v"; x: number; y: number }[] = [];
  for (let x = x1; x <= x2; x++) {
    edges.push({ kind: "h", x, y: y1 }, { kind: "h", x, y: y2 + 1 });
  }
  for (let y = y1; y <= y2; y++) {
    edges.push({ kind: "v", x: x1, y }, { kind: "v", x: x2 + 1, y });
  }
  return setWallsPure(floor, edges, "solid");
}

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
