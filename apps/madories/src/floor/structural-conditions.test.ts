import { describe, expect, it } from "vitest";
import {
  BASE_STRENGTH_PER_MULTIPLIER,
  CONSTRUCTION_PRESETS,
  DEFAULT_STRUCTURAL_CONDITIONS,
  isHeavySnowRegion,
  normalizeStructuralConditions,
  REGION_NAMES,
  regionConditions,
  wallMultiplier,
} from "./structural-conditions";

describe("structural-conditions", () => {
  it("normalizes missing conditions to defaults", () => {
    expect(normalizeStructuralConditions(undefined)).toEqual(DEFAULT_STRUCTURAL_CONDITIONS);
  });

  it("keeps provided fields and fills the rest", () => {
    const c = normalizeStructuralConditions({ region: "新潟県" });
    expect(c.region).toBe("新潟県");
    expect(c.construction).toBe(DEFAULT_STRUCTURAL_CONDITIONS.construction);
    expect(c.storyHeightMm).toBe(DEFAULT_STRUCTURAL_CONDITIONS.storyHeightMm);
  });

  it("falls back to the default region for an unknown name", () => {
    expect(regionConditions("存在しない県")).toEqual(regionConditions("東京都"));
  });

  it("covers all 47 prefectures", () => {
    expect(REGION_NAMES).toHaveLength(47);
  });

  it("flags heavy-snow regions at 100cm or more", () => {
    expect(isHeavySnowRegion("新潟県")).toBe(true);
    expect(isHeavySnowRegion("東京都")).toBe(false);
  });

  it("maps 沖縄 only below Z=1.0", () => {
    const below = REGION_NAMES.filter((n) => regionConditions(n).z < 1);
    expect(below).toEqual(["沖縄県"]);
  });

  it("reads wall multipliers from the construction preset", () => {
    expect(wallMultiplier("post_and_beam_panel", "solid")).toBe(2.5);
    expect(wallMultiplier("post_and_beam_brace", "solid")).toBe(2);
    expect(wallMultiplier("post_and_beam_panel", "window_full")).toBe(0);
    expect(wallMultiplier("post_and_beam_panel", "solid_thin")).toBe(0);
  });

  it("exposes the base strength per multiplier", () => {
    expect(BASE_STRENGTH_PER_MULTIPLIER).toBeCloseTo(1.96);
    expect(CONSTRUCTION_PRESETS.post_and_beam_panel.label).toContain("合板");
  });
});
