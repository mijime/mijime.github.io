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

  it("matches footprint aspect orientation to grid def orientation", () => {
    for (const def of ITEM_DEFS) {
      const spec = ITEM_CATALOG[def.type];
      if (def.w < def.h) {
        expect(spec.footprint.w, def.type).toBeLessThanOrEqual(spec.footprint.d);
      } else if (def.w > def.h) {
        expect(spec.footprint.w, def.type).toBeGreaterThanOrEqual(spec.footprint.d);
      }
    }
  });

  it("shelf1 has the same 180cm height as shelf2", () => {
    const spec = ITEM_CATALOG.shelf1;
    expect(spec.parts[0].size[1]).toBe(ITEM_CATALOG.shelf2.parts[0].size[1]);
    expect(spec.parts[0].size[1]).toBe(WALL_HEIGHT_CM * 0.75);
  });

  it("falls back for unknown types", () => {
    const spec = getItemSpec("chair");
    expect(spec.parts.length).toBeGreaterThan(0);
  });
});
