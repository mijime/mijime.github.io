import { describe, expect, it } from "vitest";
import { priorityClass } from "./priority";

describe("priorityClass", () => {
  it("returns empty string for medium", () => {
    expect(priorityClass("medium")).toBe("");
  });

  it("returns bold + uppercase classes for high", () => {
    const out = priorityClass("high");
    expect(out).toContain("font-bold");
    expect(out).toContain("uppercase");
  });

  it("returns italic for low", () => {
    expect(priorityClass("low")).toBe("italic");
  });
});
