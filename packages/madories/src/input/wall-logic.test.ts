import { describe, expect, it } from "bun:test";
import { resolveWallSegments } from "./wall-logic";

const CS = 40; // CellSize

describe("resolveWallSegments - no lock", () => {
  it("near top edge → top wall segment", () => {
    const result = resolveWallSegments(45, 2, CS, null, null, null);
    expect(result).toEqual([{ cx: 1, cy: 0, edge: "top" }]);
  });

  it("near left edge → left wall segment", () => {
    // Cy=1: my in [40,80), ry=my%40. Need ry>=6 to avoid top-edge. Use my=48 (ry=8).
    const result = resolveWallSegments(2, 48, CS, null, null, null);
    expect(result).toEqual([{ cx: 0, cy: 1, edge: "left" }]);
  });

  it("center of cell → no segment", () => {
    const result = resolveWallSegments(20, 20, CS, null, null, null);
    expect(result).toEqual([]);
  });
});

describe("resolveWallSegments - lock=top (horizontal drag)", () => {
  it("same cx as last → single segment at fixed cy", () => {
    const start = { mx: 45, my: 2 };
    const last = { mx: 45, my: 2 };
    // FixedCy = round(2/40) = 0, cx = floor(45/40) = 1
    const result = resolveWallSegments(45, 2, CS, "top", start, last);
    expect(result).toEqual([{ cx: 1, cy: 0, edge: "top" }]);
  });

  it("moved right → fills segments from lastCx to cx", () => {
    const start = { mx: 45, my: 2 }; // FixedCy=0
    const last = { mx: 45, my: 2 }; // LastCx=1
    // Now at mx=125: cx = floor(125/40) = 3
    const result = resolveWallSegments(125, 20, CS, "top", start, last);
    expect(result).toEqual([
      { cx: 1, cy: 0, edge: "top" },
      { cx: 2, cy: 0, edge: "top" },
      { cx: 3, cy: 0, edge: "top" },
    ]);
  });

  it("moved left → fills segments in reverse", () => {
    const start = { mx: 125, my: 2 }; // FixedCy=0
    const last = { mx: 125, my: 2 }; // LastCx=3
    // Now at mx=45: cx=1
    const result = resolveWallSegments(45, 20, CS, "top", start, last);
    expect(result).toEqual([
      { cx: 3, cy: 0, edge: "top" },
      { cx: 2, cy: 0, edge: "top" },
      { cx: 1, cy: 0, edge: "top" },
    ]);
  });

  it("ignores my when lock=top (cy fixed to startPos)", () => {
    const start = { mx: 45, my: 2 }; // FixedCy=0
    const last = { mx: 45, my: 2 };
    // My=80 would be cy=2 without lock, but lock should fix cy=0
    const result = resolveWallSegments(45, 80, CS, "top", start, last);
    expect(result).toEqual([{ cx: 1, cy: 0, edge: "top" }]);
  });
});

describe("resolveWallSegments - lock=left (vertical drag)", () => {
  it("moved down → fills segments from lastCy to cy", () => {
    const start = { mx: 2, my: 45 }; // FixedCx=0
    const last = { mx: 2, my: 45 }; // LastCy=1
    // Now at my=125: cy=3
    const result = resolveWallSegments(20, 125, CS, "left", start, last);
    expect(result).toEqual([
      { cx: 0, cy: 1, edge: "left" },
      { cx: 0, cy: 2, edge: "left" },
      { cx: 0, cy: 3, edge: "left" },
    ]);
  });

  it("ignores mx when lock=left (cx fixed to startPos)", () => {
    const start = { mx: 2, my: 45 }; // FixedCx=0
    const last = { mx: 2, my: 45 };
    // Mx=80 would be cx=2 without lock
    const result = resolveWallSegments(80, 45, CS, "left", start, last);
    expect(result).toEqual([{ cx: 0, cy: 1, edge: "left" }]);
  });
});
