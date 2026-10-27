import { describe, expect, it, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  addEntry,
  addList,
  getAllEntries,
  getAllTags,
  getEntriesByEmoji,
  getLists,
  getEntries,
  exportAll,
  importAll,
  deleteAll,
  ensureDefaultList,
  removeList,
  renameList,
  updateEntryEmoji,
  updateEntryLocation,
  updateEntryNote,
  db,
} from "./store";
import type { Entry, ExportData } from "./types";

function makeEntry(emoji: string, date: string, listId?: number): Omit<Entry, "id"> {
  return { date, timestamp: new Date(`${date}T00:00:00`).getTime(), emoji, listId };
}

describe("entries", () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.lists.clear();
  });

  it("returns all entries when no list filter", async () => {
    await addEntry(makeEntry("😊", "2026-07-10"));
    await addEntry(makeEntry("😢", "2026-07-12"));
    const all = await getAllEntries();
    expect(all).toHaveLength(2);
  });

  it("filters by listId", async () => {
    const listA = await addList("listA");
    const listB = await addList("listB");
    await addEntry(makeEntry("😊", "2026-07-10", listA));
    await addEntry(makeEntry("😢", "2026-07-10", listB));
    const a = await getAllEntries(listA);
    expect(a).toHaveLength(1);
    expect(a[0]?.emoji).toBe("😊");
    const today = await getEntries("2026-07-10", listB);
    expect(today).toHaveLength(1);
    expect(today[0]?.emoji).toBe("😢");
  });

  it("extracts hashtags from notes on add and update", async () => {
    const id = await addEntry({ ...makeEntry("😊", "2026-07-10"), note: "#仕事 と #emolog" });
    const [entry] = await getAllEntries();
    expect(entry?.tags).toEqual(["仕事", "emolog"]);
    expect(await getAllTags()).toEqual(["emolog", "仕事"]);

    await updateEntryNote(id, "#休み");
    const [updated] = await getAllEntries();
    expect(updated?.tags).toEqual(["休み"]);
  });

  it("stores optional location", async () => {
    const id = await addEntry(makeEntry("😊", "2026-07-10"));
    await updateEntryLocation(id, { lat: 35.6, lng: 139.7, accuracy: 10 });
    const [entry] = await getAllEntries();
    expect(entry?.location?.lat).toBe(35.6);
  });

  it("changes the emoji of an existing entry", async () => {
    const id = await addEntry(makeEntry("😊", "2026-07-10"));
    await updateEntryEmoji(id, "😡");
    const all = await getAllEntries();
    expect(all[0]?.emoji).toBe("😡");
  });

  it("finds emoji matches across the whole history", async () => {
    const listId = await addList("listA");
    await addEntry(makeEntry("😊", "2020-01-01", listId));
    await addEntry(makeEntry("😢", "2026-07-10", listId));
    await addEntry(makeEntry("😊", "2026-07-12", listId));
    const matches = await getEntriesByEmoji("😊", listId);
    expect(matches.map((entry) => entry.date)).toEqual(["2020-01-01", "2026-07-12"]);
  });
});

describe("lists", () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.lists.clear();
  });

  it("creates a default list once", async () => {
    const id = await ensureDefaultList();
    const again = await ensureDefaultList();
    expect(again).toBe(id);
    const lists = await getLists();
    expect(lists).toHaveLength(1);
    expect(lists[0]?.name).toBe("メイン");
  });

  it("renames only the target list", async () => {
    const a = await addList("A");
    await addList("B");
    await renameList(a, "A2");
    const names = (await getLists()).map((list) => list.name);
    expect(names).toContain("A2");
    expect(names).toContain("B");
  });

  it("removes a list and moves its entries to the first remaining list", async () => {
    const a = await addList("A");
    const b = await addList("B");
    await addEntry(makeEntry("😊", "2026-07-10", b));
    const fallback = await removeList(b);
    expect(fallback).toBe(a);
    const [entry] = await getAllEntries();
    expect(entry?.listId).toBe(a);
    expect((await getLists()).map((list) => list.id)).toEqual([a]);
  });

  it("rejects removing the last list", async () => {
    const a = await addList("A");
    await expect(removeList(a)).rejects.toThrow("最後のリストは削除できません");
  });
});

describe("exportAll", () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.lists.clear();
  });

  it("returns version 2 data", async () => {
    const id = await addList("仕事");
    await addEntry({ ...makeEntry("😊", "2026-07-10", id), note: "#work" });
    const data = await exportAll();
    expect(data.version).toBe(2);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]?.listId).toBe(id);
    expect(data.entries[0]?.tags).toEqual(["work"]);
    expect(data.lists[0]?.name).toBe("仕事");
  });
});

describe("importAll", () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.lists.clear();
  });

  it("imports v1 data by list name", async () => {
    const data = {
      version: 1,
      entries: [{ date: "2026-07-10", timestamp: 1000, emoji: "😊", list: "メイン" }],
      lists: [{ name: "メイン", order: 0 }],
    } as unknown as ExportData;
    await importAll(data);
    const entries = await getAllEntries();
    const lists = await getLists();
    expect(entries).toHaveLength(1);
    expect(lists).toHaveLength(1);
    expect(entries[0]?.listId).toBe(lists[0]?.id);
  });

  it("imports v2 data by list id", async () => {
    const data: ExportData = {
      version: 2,
      entries: [{ date: "2026-07-10", timestamp: 1000, emoji: "😊", listId: 99 }],
      lists: [{ id: 99, name: "仕事", order: 0 }],
    };
    await importAll(data);
    const entries = await getAllEntries();
    const lists = await getLists();
    expect(lists).toHaveLength(1);
    expect(entries[0]?.listId).toBe(lists[0]?.id);
  });

  it("merges duplicate list names and remaps entries", async () => {
    const data: ExportData = {
      version: 2,
      entries: [
        { date: "2026-07-10", timestamp: 1000, emoji: "😊", listId: 1 },
        { date: "2026-07-11", timestamp: 2000, emoji: "😢", listId: 2 },
      ],
      lists: [
        { id: 1, name: "A", order: 0 },
        { id: 2, name: "A", order: 1 },
      ],
    };
    await importAll(data);
    const lists = await getLists();
    const entries = await getAllEntries();
    expect(lists).toHaveLength(1);
    expect(entries).toHaveLength(2);
    expect(new Set(entries.map((entry) => entry.listId)).size).toBe(1);
  });

  it("appends to existing data", async () => {
    await addEntry(makeEntry("😢", "2026-07-12"));
    const data = {
      version: 1,
      entries: [{ date: "2026-07-10", timestamp: 1000, emoji: "😊" }],
      lists: [],
    } as unknown as ExportData;
    await importAll(data);
    expect(await getAllEntries()).toHaveLength(2);
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
