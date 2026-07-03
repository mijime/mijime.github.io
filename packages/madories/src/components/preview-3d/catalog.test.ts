import { describe, expect, it } from "vitest";
import { ITEM_DEFS } from "../../items";
import { WALL_HEIGHT_CM } from "./config";
import { getItemSpec, ITEM_CATALOG } from "./catalog";

describe("catalog", () => {
  it("defines a spec for every ItemType", () => {
    for (const def of ITEM_DEFS) {
      expect(ITEM_CATALOG[def.type], def.type).toBeDefined();
    }
  });

  it("keeps all parts within the footprint horizontally", () => {
    for (const [type, spec] of Object.entries(ITEM_CATALOG)) {
      for (const part of spec.parts) {
        expect(Math.abs(part.offset[0]) + part.size[0] / 2, type).toBeLessThanOrEqual(
          spec.footprint.w / 2 + 1e-6,
        );
        expect(Math.abs(part.offset[2]) + part.size[2] / 2, type).toBeLessThanOrEqual(
          spec.footprint.d / 2 + 1e-6,
        );
      }
    }
  });

  it("keeps all parts below wall height", () => {
    for (const [type, spec] of Object.entries(ITEM_CATALOG)) {
      for (const part of spec.parts) {
        expect(part.offset[1] + part.size[1], type).toBeLessThanOrEqual(WALL_HEIGHT_CM);
      }
    }
  });

  it("falls back for unknown types", () => {
    const spec = getItemSpec("chair");
    expect(spec.parts.length).toBeGreaterThan(0);
  });
});
