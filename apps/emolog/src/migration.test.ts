import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeAll, describe, expect, it } from "vitest";
import { addList, db, getAllEntries, getLists } from "./store";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.addEventListener("success", () => resolve());
    request.addEventListener("error", () => reject(request.error));
    request.addEventListener("blocked", () => resolve());
  });
}

describe("v3 → v5 migration", () => {
  beforeAll(async () => {
    await deleteDatabase("emolog");
    const legacy = new Dexie("emolog");
    legacy.version(3).stores({
      entries: "++id, date, timestamp, list",
      lists: "++id, name, order",
    });
    await legacy.open();
    await legacy.table("lists").bulkAdd([
      { name: "A", order: 0 },
      { name: "A", order: 1 },
      { name: "B", order: 2 },
    ]);
    await legacy.table("entries").bulkAdd([
      { date: "2026-10-27", timestamp: 1000, emoji: "😊", note: "#work", list: "A" },
      { date: "2026-10-27", timestamp: 2000, emoji: "😢", list: "B" },
      { date: "2026-10-27", timestamp: 3000, emoji: "😡", list: "missing" },
    ]);
    legacy.close();
    await db.open();
  });

  it("deduplicates list names", async () => {
    const lists = await getLists();
    expect(lists.map((list) => list.name)).toEqual(["A", "B", "メイン"]);
  });

  it("moves entries to list ids and keeps unknown lists in メイン", async () => {
    const lists = await getLists();
    const byName = new Map(lists.map((list) => [list.name, list.id]));
    const entries = await getAllEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0]?.listId).toBe(byName.get("A"));
    expect(entries[1]?.listId).toBe(byName.get("B"));
    expect(entries[2]?.listId).toBe(byName.get("メイン"));
    expect(entries.every((entry) => (entry as { list?: string }).list === undefined)).toBe(true);
  });

  it("backfills tags and enforces unique list names", async () => {
    const entries = await getAllEntries();
    expect(entries[0]?.tags).toEqual(["work"]);
    await expect(addList("A")).rejects.toThrow();
  });
});
