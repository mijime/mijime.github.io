import { describe, expect, it } from "vitest";
import { createFloorPlan } from "../store";
import { MM_PER_CELL } from "../units";
import { computeQuadrantBalance, computeWallBounds } from "./quadrant-balance";
import { setWallsPure } from "./walls";

function floor(w: number, h: number) {
  return createFloorPlan("t", w, h);
}

const perimeterEdges: { kind: "h" | "v"; x: number; y: number }[] = [
  { kind: "h", x: 0, y: 0 },
  { kind: "h", x: 1, y: 0 },
  { kind: "h", x: 2, y: 0 },
  { kind: "h", x: 3, y: 0 },
  { kind: "h", x: 0, y: 4 },
  { kind: "h", x: 1, y: 4 },
  { kind: "h", x: 2, y: 4 },
  { kind: "h", x: 3, y: 4 },
  { kind: "v", x: 0, y: 0 },
  { kind: "v", x: 0, y: 1 },
  { kind: "v", x: 0, y: 2 },
  { kind: "v", x: 0, y: 3 },
  { kind: "v", x: 4, y: 0 },
  { kind: "v", x: 4, y: 1 },
  { kind: "v", x: 4, y: 2 },
  { kind: "v", x: 4, y: 3 },
];

function withPerimeter() {
  let f = floor(4, 4);
  f = setWallsPure(f, perimeterEdges, "solid");
  return f;
}

describe("computeWallBounds", () => {
  it("bounds the placed house independently of the canvas size", () => {
    // 10x10 canvas, house placed at an offset (cols 2–5, rows 1–3 region)
    let f = floor(10, 10);
    f = setWallsPure(f, [{ kind: "h", x: 2, y: 1 }], "solid");
    f = setWallsPure(f, [{ kind: "h", x: 3, y: 1 }], "solid");
    f = setWallsPure(f, [{ kind: "h", x: 4, y: 1 }], "solid");
    f = setWallsPure(f, [{ kind: "v", x: 2, y: 1 }], "solid");
    const b = computeWallBounds(f)!;
    expect(b).toEqual({ maxX: 5, maxY: 2, midX: 3, midY: 1, minX: 2, minY: 1 });
  });

  it("returns null when the floor has no walls", () => {
    expect(computeWallBounds(floor(5, 5))).toBeNull();
  });
});

describe("computeQuadrantBalance", () => {
  it("marks every quadrant OK when each direction is present everywhere", () => {
    const b = computeQuadrantBalance(withPerimeter());
    expect(b.quadrants.map((q) => q.name)).toEqual(["NW", "NE", "SW", "SE"]);
    for (const q of b.quadrants) {
      expect(q.ok).toBe(true);
      expect(q.h).toBe(2 * MM_PER_CELL);
      expect(q.v).toBe(2 * MM_PER_CELL);
      expect(q.ratio).toBe(1);
    }
  });

  it("anchors the partition to a placed house (offset from origin)", () => {
    // House sits at cols 2..6, rows 2..5 inside a 10x10 canvas.
    let f = floor(10, 10);
    const edges: { kind: "h" | "v"; x: number; y: number }[] = [];
    for (let x = 2; x <= 5; x++) edges.push({ kind: "h", x, y: 2 });
    for (let x = 2; x <= 5; x++) edges.push({ kind: "h", x, y: 5 });
    for (let y = 2; y <= 4; y++) edges.push({ kind: "v", x: 2, y });
    for (let y = 2; y <= 4; y++) edges.push({ kind: "v", x: 6, y });
    f = setWallsPure(f, edges, "solid");

    const b = computeQuadrantBalance(f);
    // House bbox cols 2..6, rows 2..5 → midX=4, midY=3
    expect(b.bounds).toMatchObject({ midX: 4, midY: 3 });
    for (const q of b.quadrants) {
      expect(q.ok).toBe(true);
    }
  });

  it("flags the quadrants lacking a vertical wall", () => {
    // Drop the entire right edge (x=4)
    let f = floor(4, 4);
    f = setWallsPure(
      f,
      perimeterEdges.filter((e) => !(e.kind === "v" && e.x === 4)),
      "solid",
    );
    const byName = new Map(computeQuadrantBalance(f).quadrants.map((q) => [q.name, q]));
    expect(byName.get("NW")!.ok).toBe(true);
    expect(byName.get("SW")!.ok).toBe(true);
    expect(byName.get("NE")!.ok).toBe(false);
    expect(byName.get("SE")!.ok).toBe(false);
    expect(byName.get("NE")!.v).toBe(0);
    expect(byName.get("NE")!.h).toBe(2 * MM_PER_CELL);
    expect(byName.get("NE")!.ratio).toBe(0);
  });

  it("splits a run crossing the divider toward both adjacent quadrants", () => {
    // Full-width top horizontal wall + full-height left vertical wall
    let f = floor(4, 4);
    f = setWallsPure(
      f,
      [
        { kind: "h", x: 0, y: 0 },
        { kind: "h", x: 1, y: 0 },
        { kind: "h", x: 2, y: 0 },
        { kind: "h", x: 3, y: 0 },
        { kind: "v", x: 0, y: 0 },
        { kind: "v", x: 0, y: 1 },
        { kind: "v", x: 0, y: 2 },
        { kind: "v", x: 0, y: 3 },
      ],
      "solid",
    );
    const byName = new Map(computeQuadrantBalance(f).quadrants.map((q) => [q.name, q]));
    expect(byName.get("NW")!.h).toBe(2 * MM_PER_CELL);
    expect(byName.get("NE")!.h).toBe(2 * MM_PER_CELL);
    expect(byName.get("NW")!.v).toBe(2 * MM_PER_CELL);
    expect(byName.get("NE")!.v).toBe(0);
    expect(byName.get("NW")!.ok).toBe(true);
    expect(byName.get("NE")!.ok).toBe(false);
  });

  it("handles odd-size houses via floor division of the bounding box", () => {
    // A small house: walls on [0,2) cols / [0,2) rows → midX=1, midY=1
    let f = floor(5, 5);
    f = setWallsPure(
      f,
      [
        { kind: "h", x: 0, y: 0 },
        { kind: "h", x: 1, y: 0 },
        { kind: "v", x: 0, y: 0 },
        { kind: "v", x: 0, y: 1 },
      ],
      "solid",
    );
    const byName = new Map(computeQuadrantBalance(f).quadrants.map((q) => [q.name, q]));
    // NW is the only fully-braced quadrant
    expect(byName.get("NW")!.ok).toBe(true);
    // NE: top wall present but no vertical wall
    expect(byName.get("NE")!.v).toBe(0);
    expect(byName.get("NE")!.ok).toBe(false);
    // SW: left wall present but no horizontal wall
    expect(byName.get("SW")!.h).toBe(0);
    expect(byName.get("SW")!.ok).toBe(false);
  });
});
