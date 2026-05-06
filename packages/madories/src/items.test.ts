import { describe, expect, it } from "bun:test";
import { ITEM_DEF_MAP } from "./items";

describe("ItemDef (unified)", () => {
  it("provides color for all item types", () => {
    for (const [, def] of ITEM_DEF_MAP) {
      expect(def.color).toBeDefined();
      expect(typeof def.color.light).toBe("string");
      expect(typeof def.color.dark).toBe("string");
    }
  });

  it("provides icon draw function for all item types", () => {
    for (const [, def] of ITEM_DEF_MAP) {
      expect(typeof def.icon).toBe("function");
    }
  });

  it("provides heightFactor with correct default fallback", () => {
    expect(ITEM_DEF_MAP.get("chair")!.heightFactor).toBe(0.5);
    expect(ITEM_DEF_MAP.get("toilet")!.heightFactor).toBeUndefined(); // Default 0.8
  });

  it("provides depthFactor with correct default fallback", () => {
    expect(ITEM_DEF_MAP.get("tv")!.depthFactor).toBe(0.15);
    expect(ITEM_DEF_MAP.get("sofa")!.depthFactor).toBeUndefined(); // Default 1
  });

  it("provides parts factory for multi-part items", () => {
    const sofaDef = ITEM_DEF_MAP.get("sofa")!;
    expect(typeof sofaDef.parts).toBe("function");
    const parts = sofaDef.parts!(10, 0.9 * 10, 0.8 * 10, 2 * 10);
    expect(parts).toHaveLength(2);
    expect(parts[0].color).toBeDefined();
    expect(parts[0].geometry).toHaveLength(3);
    expect(parts[0].position).toHaveLength(3);
  });

  it("has no parts factory for simple items", () => {
    expect(ITEM_DEF_MAP.get("chair")!.parts).toBeUndefined();
  });
});
