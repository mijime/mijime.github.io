import { describe, expect, it } from "vitest";
import { extractTags, normalizeTag } from "./tags";

describe("extractTags", () => {
  it("extracts ascii hashtags and lowercases them", () => {
    expect(extractTags("今日は #Work と #emolog")).toEqual(["work", "emolog"]);
  });

  it("supports full-width hash and unicode tags", () => {
    expect(extractTags("＃仕事 と ＃散歩")).toEqual(["仕事", "散歩"]);
  });

  it("deduplicates tags", () => {
    expect(extractTags("#work #Work #WORK")).toEqual(["work"]);
  });

  it("returns an empty array for notes without tags", () => {
    expect(extractTags()).toEqual([]);
    expect(extractTags("")).toEqual([]);
    expect(extractTags("タグなし")).toEqual([]);
  });
});

describe("normalizeTag", () => {
  it("removes leading hashes and lowercases", () => {
    expect(normalizeTag("##Work")).toBe("work");
    expect(normalizeTag("＃散歩")).toBe("散歩");
  });
});
