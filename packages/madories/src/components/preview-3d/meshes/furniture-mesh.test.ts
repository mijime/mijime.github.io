import { describe, expect, it } from "bun:test";
import { getItemDrawOffset, getItemCenterPosition } from "./furniture-mesh";

describe("getItemDrawOffset", () => {
  it("returns no offset for 0° rotation", () => {
    const result = getItemDrawOffset(1, 2, 0);
    expect(result).toEqual({ effectiveW: 1, effectiveH: 2, offX: 0, offY: 0 });
  });

  it("swaps dimensions and offsets X for 90° rotation on asymmetric item", () => {
    const result = getItemDrawOffset(1, 2, 90);
    expect(result).toEqual({ effectiveW: 2, effectiveH: 1, offX: -1, offY: 0 });
  });

  it("offsets Y for 180° rotation on asymmetric item", () => {
    const result = getItemDrawOffset(1, 2, 180);
    expect(result).toEqual({ effectiveW: 1, effectiveH: 2, offX: 0, offY: -1 });
  });

  it("swaps dimensions but no offsets for 270° on larger asymmetric item", () => {
    const result = getItemDrawOffset(2, 3, 270);
    expect(result).toEqual({ effectiveW: 3, effectiveH: 2, offX: 0, offY: 0 });
  });

  it("returns no offset for symmetric items regardless of rotation", () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const result = getItemDrawOffset(1, 1, rotation);
      expect(result).toEqual({ effectiveW: 1, effectiveH: 1, offX: 0, offY: 0 });
    }
  });

  it("handles wider items correctly at 90°", () => {
    const result = getItemDrawOffset(2, 1, 90);
    expect(result).toEqual({ effectiveW: 1, effectiveH: 2, offX: 0, offY: 0 });
  });
});

describe("getItemCenterPosition", () => {
  const c = 10;

  it("centers a single-tile item on its cell", () => {
    const result = getItemCenterPosition(0, 0, 1, 1, c);
    expect(result).toEqual({ posX: 0, posZ: 0 });
  });

  it("centers a 1x2 item across its 2-cell span", () => {
    const result = getItemCenterPosition(0, 0, 1, 2, c);
    expect(result).toEqual({ posX: 0, posZ: 5 });
  });

  it("centers a 2x1 item across its 2-cell width", () => {
    const result = getItemCenterPosition(0, 0, 2, 1, c);
    expect(result).toEqual({ posX: 5, posZ: 0 });
  });

  it("accounts for draw offset in position", () => {
    const result = getItemCenterPosition(-1, 0, 2, 1, c);
    expect(result).toEqual({ posX: -5, posZ: 0 });
  });

  it("works for non-zero origin cells", () => {
    const result = getItemCenterPosition(2, 3, 1, 1, c);
    expect(result).toEqual({ posX: 20, posZ: 30 });
  });
});
