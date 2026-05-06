import { describe, expect, it } from "bun:test";
import { FLOOR_COLORS, WALL_COLORS } from "./materials";

describe("FLOOR_COLORS", () => {
  it("has light and dark for all floor types", () => {
    for (const entry of Object.values(FLOOR_COLORS)) {
      expect(typeof entry.light).toBe("string");
      expect(typeof entry.dark).toBe("string");
    }
  });
});

describe("WALL_COLORS", () => {
  it("has light and dark for all wall types", () => {
    for (const entry of Object.values(WALL_COLORS)) {
      expect(typeof entry.light).toBe("string");
      expect(typeof entry.dark).toBe("string");
    }
  });
});
