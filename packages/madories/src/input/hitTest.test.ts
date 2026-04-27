import { describe, expect, it } from "bun:test";
import { hitTestEdge } from "./hitTest";

describe("hitTestEdge", () => {
  const cellSize = 32;
  const threshold = 6;

  it("top edge near y=0", () => {
    expect(hitTestEdge(16, 2, cellSize, threshold)).toEqual({
      cx: 0,
      cy: 0,
      edge: "top",
    });
  });

  it("left edge near x=0", () => {
    expect(hitTestEdge(2, 16, cellSize, threshold)).toEqual({
      cx: 0,
      cy: 0,
      edge: "left",
    });
  });

  it("bottom edge maps to next row top", () => {
    expect(hitTestEdge(16, 30, cellSize, threshold)).toEqual({
      cx: 0,
      cy: 1,
      edge: "top",
    });
  });

  it("right edge maps to next col left", () => {
    expect(hitTestEdge(30, 16, cellSize, threshold)).toEqual({
      cx: 1,
      cy: 0,
      edge: "left",
    });
  });

  it("cell center returns null", () => {
    expect(hitTestEdge(16, 16, cellSize, threshold)).toBeNull();
  });

  it("second cell top edge", () => {
    expect(hitTestEdge(48, 2, cellSize, threshold)).toEqual({
      cx: 1,
      cy: 0,
      edge: "top",
    });
  });
});
