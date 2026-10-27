import { describe, expect, it } from "vitest";
import { boundsOf, entriesWithLocation } from "./map";
import type { Entry } from "./types";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    date: "2026-10-27",
    timestamp: 1000,
    emoji: "😊",
    ...overrides,
  };
}

describe("entriesWithLocation", () => {
  it("keeps only entries with location", () => {
    const located = entriesWithLocation([entry({ location: { lat: 35.6, lng: 139.7 } }), entry()]);
    expect(located).toHaveLength(1);
    expect(located[0]?.location.lat).toBe(35.6);
  });
});

describe("boundsOf", () => {
  it("returns null when there are no entries", () => {
    expect(boundsOf([])).toBeNull();
  });

  it("computes min/max latitude and longitude", () => {
    const located = entriesWithLocation([
      entry({ location: { lat: 35.6, lng: 139.7 } }),
      entry({ location: { lat: 34.7, lng: 135.5 } }),
      entry({ location: { lat: 36.0, lng: 140.0 } }),
    ]);
    expect(boundsOf(located)).toEqual({
      minLat: 34.7,
      maxLat: 36,
      minLng: 135.5,
      maxLng: 140,
    });
  });
});
