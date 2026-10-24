import { describe, expect, it } from "vitest";
import type { CardEffect } from "../../types";
import { CARD_EFFECTS, effectAiValue, effectDescription, effectLabel } from "./index";

const SAMPLES: CardEffect[] = [
  { kind: "draw", amount: 1 },
  { kind: "action", amount: 1 },
  { kind: "debt-clean", amount: 1 },
  { kind: "deadline", amount: 1 },
  { kind: "token", token: "mi", amount: 1 },
  { kind: "shield", amount: 1 },
];

describe("card effect plugins", () => {
  it("すべての効果 kind に plugin がある", () => {
    expect(Object.keys(CARD_EFFECTS).toSorted()).toEqual(
      SAMPLES.map((effect) => effect.kind).toSorted(),
    );
  });

  it("すべての効果に表示名・説明・AI評価がある", () => {
    for (const effect of SAMPLES) {
      expect(effectLabel(effect)).toBeTruthy();
      expect(effectDescription(effect)).toBeTruthy();
      expect(effectAiValue(CARD_EFFECTS, effect)).toBeGreaterThan(0);
    }
  });
});
