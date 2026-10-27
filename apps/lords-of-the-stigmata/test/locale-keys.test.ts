import { describe, it, expect } from "vitest";
import { ja } from "../src/locales/ja.ts";
import { en } from "../src/locales/en.ts";

function flatKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => flatKeys(v, prefix ? `${prefix}.${k}` : k));
}

describe("locale key parity", () => {
  it("ja and en have identical key sets", () => {
    expect(flatKeys(ja).toSorted()).toEqual(flatKeys(en).toSorted());
  });
});
