import { describe, expect, it, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { addEntry, getAllEntries, db } from "./store";
import type { Entry } from "./types";

function makeEntry(emoji: string, date: string, list?: string): Omit<Entry, "id"> {
  return { date, timestamp: Date.now(), emoji, list };
}

describe("getAllEntries", () => {
  beforeEach(async () => {
    await db.entries.clear();
  });

  it("returns all entries when no list filter", async () => {
    await addEntry(makeEntry("😊", "2026-07-10"));
    await addEntry(makeEntry("😢", "2026-07-12"));
    const all = await getAllEntries();
    expect(all).toHaveLength(2);
  });

  it("filters by list", async () => {
    await addEntry(makeEntry("😊", "2026-07-10", "listA"));
    await addEntry(makeEntry("😢", "2026-07-10", "listB"));
    const a = await getAllEntries("listA");
    expect(a).toHaveLength(1);
    expect(a[0].emoji).toBe("😊");
  });

  it("returns empty array when no entries", async () => {
    const all = await getAllEntries();
    expect(all).toEqual([]);
  });
});
