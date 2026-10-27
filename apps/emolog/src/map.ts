import type { Entry, EntryLocation } from "./types";

export type LocatedEntry = Entry & { location: EntryLocation };

export function entriesWithLocation(entries: Entry[]): LocatedEntry[] {
  return entries.filter((entry): entry is LocatedEntry => entry.location !== undefined);
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function boundsOf(entries: LocatedEntry[]): MapBounds | null {
  if (entries.length === 0) return null;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    const { lat, lng } = entry.location;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}
