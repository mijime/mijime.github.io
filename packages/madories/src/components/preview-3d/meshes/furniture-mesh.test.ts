import { describe, expect, it } from "bun:test";
import { getItemCenterPosition } from "./furniture-mesh";

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

  it("centers a 2x1 item across its 2-cell span", () => {
    const result = getItemCenterPosition(0, 0, 2, 1, c);
    expect(result).toEqual({ posX: 5, posZ: 0 });
  });

  it("works for non-zero origin cells", () => {
    const result = getItemCenterPosition(2, 3, 1, 1, c);
    expect(result).toEqual({ posX: 20, posZ: 30 });
  });

  it("handles 2x2 item centered", () => {
    const result = getItemCenterPosition(0, 0, 2, 2, c);
    expect(result).toEqual({ posX: 5, posZ: 5 });
  });
});
