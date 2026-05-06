import { describe, expect, it } from "bun:test";
import { getItemDepthFactor, getItemHeightFactor, ITEM_HEIGHT_FACTOR_DEFAULT } from "./materials";

describe("getItemHeightFactor", () => {
  it("returns 0.5 for chair", () => {
    expect(getItemHeightFactor("chair")).toBe(0.5);
  });

  it("returns 0.5 for bed_single", () => {
    expect(getItemHeightFactor("bed_single")).toBe(0.5);
  });

  it("returns 0.5 for bed_double", () => {
    expect(getItemHeightFactor("bed_double")).toBe(0.5);
  });

  it("returns 1.5 for washer", () => {
    expect(getItemHeightFactor("washer")).toBe(1.5);
  });

  it("returns 1.5 for fridge", () => {
    expect(getItemHeightFactor("fridge")).toBe(1.5);
  });

  it("returns 1.5 for shelf1", () => {
    expect(getItemHeightFactor("shelf1")).toBe(1.5);
  });

  it("returns 1.5 for shelf2", () => {
    expect(getItemHeightFactor("shelf2")).toBe(1.5);
  });

  it("returns default 0.8 for items without explicit factor", () => {
    expect(getItemHeightFactor("desk")).toBe(ITEM_HEIGHT_FACTOR_DEFAULT);
    expect(getItemHeightFactor("toilet")).toBe(ITEM_HEIGHT_FACTOR_DEFAULT);
    expect(getItemHeightFactor("stairs")).toBe(ITEM_HEIGHT_FACTOR_DEFAULT);
  });
});

describe("getItemDepthFactor", () => {
  it("returns 1 for items without explicit depth factor", () => {
    expect(getItemDepthFactor("sofa")).toBe(1);
    expect(getItemDepthFactor("desk")).toBe(1);
    expect(getItemDepthFactor("fridge")).toBe(1);
  });

  it("returns thinner factor for flat-screen items", () => {
    expect(getItemDepthFactor("tv")).toBe(0.15);
  });
});
