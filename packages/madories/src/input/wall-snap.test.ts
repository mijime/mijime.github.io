import { describe, expect, it } from "vitest";
import { nearestEdge, resolveEdges, snapVertex } from "./wall-snap";

describe("snapVertex", () => {
  it("snaps to nearest vertex and clamps", () => {
    expect(snapVertex(33, 30, 32, 10, 10)).toEqual({ vx: 1, vy: 1 });
    expect(snapVertex(-5, 500, 32, 10, 10)).toEqual({ vx: 0, vy: 10 });
  });

  it("snaps to even vertices with step=2 (cell-1 mode)", () => {
    expect(snapVertex(33, 70, 32, 40, 40, 2)).toEqual({ vx: 2, vy: 2 });
    expect(snapVertex(70, 70, 32, 40, 40, 2)).toEqual({ vx: 2, vy: 2 });
    expect(snapVertex(100, 70, 32, 40, 40, 2)).toEqual({ vx: 4, vy: 2 });
  });
});

describe("resolveEdges", () => {
  it("returns horizontal run when |dx| >= |dy|", () => {
    expect(resolveEdges({ vx: 1, vy: 2 }, { vx: 4, vy: 3 })).toEqual([
      { kind: "h", x: 1, y: 2 },
      { kind: "h", x: 2, y: 2 },
      { kind: "h", x: 3, y: 2 },
    ]);
  });
  it("returns vertical run when |dy| > |dx|, in any direction", () => {
    expect(resolveEdges({ vx: 2, vy: 5 }, { vx: 2, vy: 2 })).toEqual([
      { kind: "v", x: 2, y: 2 },
      { kind: "v", x: 2, y: 3 },
      { kind: "v", x: 2, y: 4 },
    ]);
  });
  it("returns empty for same vertex", () => {
    expect(resolveEdges({ vx: 3, vy: 3 }, { vx: 3, vy: 3 })).toEqual([]);
  });
});

describe("nearestEdge", () => {
  it("finds top edge near horizontal grid line", () => {
    expect(nearestEdge(48, 2, 32, 10, 10)).toEqual({ kind: "h", x: 1, y: 0 });
  });
  it("finds vertical edge near vertical grid line", () => {
    expect(nearestEdge(63, 48, 32, 10, 10)).toEqual({ kind: "v", x: 2, y: 1 });
  });
  it("returns null far from any line", () => {
    expect(nearestEdge(48, 48, 32, 10, 10)).toBeNull();
  });
});
