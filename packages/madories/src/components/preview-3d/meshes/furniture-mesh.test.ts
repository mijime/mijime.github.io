import { describe, expect, it } from "bun:test";
import { getItemDrawOffset } from "./furniture-mesh";

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

  it("swaps dimensions and offsets both X and Y for 270° on larger asymmetric item", () => {
    const result = getItemDrawOffset(2, 3, 270);
    expect(result).toEqual({ effectiveW: 3, effectiveH: 2, offX: -2, offY: -1 });
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
