import { describe, expect, it, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  addEntry,
  addList,
  getAllEntries,
  getLists,
  exportAll,
  importAll,
  deleteAll,
  db,
} from "./store";
import type { Entry } from "./types";
import type { ExportData } from "./types";

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

describe("exportAll", () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.lists.clear();
  });

  it("returns empty data when nothing stored", async () => {
    const data = await exportAll();
    expect(data.entries).toEqual([]);
    expect(data.lists).toEqual([]);
    expect(data.version).toBe(1);
  });

  it("exports all entries and lists", async () => {
    await addList("仕事");
    await addEntry(makeEntry("😊", "2026-07-10", "仕事"));
    await addEntry(makeEntry("😢", "2026-07-12"));
    const data = await exportAll();
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].emoji).toBe("😊");
    expect(data.lists).toHaveLength(1);
    expect(data.lists[0].name).toBe("仕事");
    expect(data.version).toBe(1);
  });
});

describe("importAll", () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.lists.clear();
  });

  it("imports entries and lists into empty database", async () => {
    const data: ExportData = {
      version: 1,
      entries: [{ date: "2026-07-10", timestamp: 1000, emoji: "😊" }],
      lists: [{ name: "メイン", order: 0 }],
    };
    await importAll(data);
    const entries = await getAllEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].emoji).toBe("😊");
    const lists = await getLists();
    expect(lists).toHaveLength(1);
    expect(lists[0].name).toBe("メイン");
  });

  it("appends to existing data (no dedup)", async () => {
    await addEntry(makeEntry("😢", "2026-07-12"));
    const data: ExportData = {
      version: 1,
      entries: [{ date: "2026-07-10", timestamp: 1000, emoji: "😊" }],
      lists: [],
    };
    await importAll(data);
    const entries = await getAllEntries();
    expect(entries).toHaveLength(2);
  });
});

describe("deleteAll", () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.lists.clear();
  });

  it("removes all entries and lists", async () => {
    await addList("listA");
    await addEntry(makeEntry("😊", "2026-07-10"));
    await deleteAll();
    expect(await getAllEntries()).toEqual([]);
    expect(await getLists()).toEqual([]);
  });
});
