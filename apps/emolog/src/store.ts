import Dexie, { type Table } from "dexie";
import { extractTags, normalizeTag } from "./tags";
import type { Entry, EntryLocation, ExportData, ListDef } from "./types";

export const db = new Dexie("emolog") as Dexie & {
  entries: Table<Entry, number>;
  lists: Table<ListDef, number>;
};

db.version(1).stores({
  entries: "++id, date, timestamp",
});

db.version(2).stores({
  entries: "++id, date, timestamp, list",
  lists: "++id, name",
});

db.version(3).stores({
  entries: "++id, date, timestamp, list",
  lists: "++id, name, order",
});

// v4: Entry.list（名前）→ Entry.listId（ID）へ移行し、tags を追加する。
// 同じ名前のリストは1つに統合してから、v5 で一意制約を付ける。
db.version(4)
  .stores({
    entries: "++id, date, timestamp, listId, *tags",
    lists: "++id, name, order",
  })
  .upgrade(async (tx) => {
    const listsTable = tx.table("lists");
    const entriesTable = tx.table("entries");
    const lists = (await listsTable.toArray()) as ListDef[];
    const byName = new Map<string, number>();
    const duplicates: number[] = [];

    for (const list of lists) {
      if (list.id === undefined) continue;
      if (byName.has(list.name)) {
        duplicates.push(list.id);
      } else {
        byName.set(list.name, list.id);
      }
    }
    if (duplicates.length > 0) {
      await Promise.all(duplicates.map((duplicateId) => listsTable.delete(duplicateId)));
    }

    const entries = (await entriesTable.toArray()) as (Entry & { list?: string })[];
    const needsMainList = entries.some((entry) => {
      const name = entry.list;
      return !name || !byName.has(name);
    });
    let mainId = byName.get("メイン");
    if (mainId === undefined && needsMainList) {
      const nextOrder = lists.reduce((max, list) => Math.max(max, list.order), 0) + 1;
      mainId = (await listsTable.add({ name: "メイン", order: nextOrder })) as number;
      byName.set("メイン", mainId);
    }

    await entriesTable.toCollection().modify((entry: Entry & { list?: string }) => {
      const name = entry.list;
      entry.listId = (name ? byName.get(name) : undefined) ?? mainId;
      entry.tags = extractTags(entry.note);
      delete entry.list;
    });
  });

// v5: リスト名の一意制約。v4 で重複を統合済み。
db.version(5).stores({
  entries: "++id, date, timestamp, listId, *tags",
  lists: "++id, &name, order",
});

// ── Entries ──

export async function getEntries(date: string, listId?: number): Promise<Entry[]> {
  let collection = db.entries.where("date").equals(date);
  if (listId !== undefined) {
    collection = collection.filter((entry) => entry.listId === listId);
  }
  return collection.sortBy("timestamp");
}

export async function getEntriesByDateRange(
  from: string,
  to: string,
  listId?: number,
): Promise<Entry[]> {
  let collection = db.entries.where("date").between(from, to, true, true);
  if (listId !== undefined) {
    collection = collection.filter((entry) => entry.listId === listId);
  }
  return collection.sortBy("timestamp");
}

export async function getAllEntries(listId?: number): Promise<Entry[]> {
  if (listId !== undefined) {
    return db.entries.where("listId").equals(listId).sortBy("timestamp");
  }
  return db.entries.orderBy("timestamp").toArray();
}

/** 絵文字で全期間を検索する。履歴の絵文字フィルタはページングせず全件を対象にする。 */
export async function getEntriesByEmoji(emoji: string, listId?: number): Promise<Entry[]> {
  const entries = await getAllEntries(listId);
  return entries.filter((entry) => entry.emoji === emoji);
}

export async function getAllTags(listId?: number): Promise<string[]> {
  const entries =
    listId !== undefined
      ? await db.entries.where("listId").equals(listId).toArray()
      : await db.entries.toArray();
  const tags = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) tags.add(tag);
  }
  return [...tags].toSorted((a, b) => a.localeCompare(b));
}

export async function addEntry(entry: Omit<Entry, "id">): Promise<number> {
  return db.entries.add({
    ...entry,
    tags: entry.tags?.length ? entry.tags.map(normalizeTag) : extractTags(entry.note),
  });
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id);
}

export async function updateEntryNote(id: number, note: string): Promise<number> {
  return db.entries.update(id, { note: note || undefined, tags: extractTags(note) });
}

export async function updateEntryEmoji(id: number, emoji: string): Promise<number> {
  return db.entries.update(id, { emoji });
}

export async function updateEntryLocation(id: number, location: EntryLocation): Promise<number> {
  return db.entries.update(id, { location });
}

// ── Lists ──

export async function getLists(): Promise<ListDef[]> {
  return db.lists.orderBy("order").toArray();
}

export async function getListById(id: number): Promise<ListDef | undefined> {
  return db.lists.get(id);
}

export async function addList(name: string): Promise<number> {
  const count = await db.lists.count();
  return db.lists.add({ name, order: count });
}

export async function renameList(id: number, newName: string): Promise<void> {
  await db.lists.update(id, { name: newName });
}

/** リストを削除し、所属していた記録を残りの先頭リストへ移す。 */
export async function removeList(id: number): Promise<number> {
  const lists = await getLists();
  const fallback = lists.find((list) => list.id !== id);
  if (fallback?.id === undefined) {
    throw new Error("最後のリストは削除できません");
  }
  const fallbackId = fallback.id;
  await db.transaction("rw", db.lists, db.entries, async () => {
    await db.entries.where("listId").equals(id).modify({ listId: fallbackId });
    await db.lists.delete(id);
  });
  return fallbackId;
}

/** 先頭リストの ID を返す。リストが無ければ「メイン」を作成する。 */
export async function ensureDefaultList(): Promise<number> {
  const lists = await getLists();
  const first = lists[0];
  if (first?.id !== undefined) return first.id;
  return db.lists.add({ name: "メイン", order: 0 });
}

export async function exportAll(): Promise<ExportData> {
  const [entries, lists] = await Promise.all([
    db.entries.orderBy("timestamp").toArray(),
    db.lists.orderBy("order").toArray(),
  ]);
  return { entries, lists, version: 2 };
}

/**
 * v1（リスト名）と v2（リスト ID）の両方を受け入れる。
 * リストは名前で突き合わせ、既存リストがあれば再利用する。
 */
export async function importAll(data: ExportData): Promise<void> {
  const existingLists = await getLists();
  const byName = new Map<string, number>();
  for (const list of existingLists) {
    if (list.id !== undefined) byName.set(list.name, list.id);
  }

  const idMap = new Map<number, number>();
  const nameMap = new Map<string, number>();
  let order = existingLists.length;

  for (const list of data.lists ?? []) {
    const existingId = byName.get(list.name);
    if (existingId !== undefined) {
      if (list.id !== undefined) idMap.set(list.id, existingId);
      nameMap.set(list.name, existingId);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop -- リストは order 順に1件ずつ追加する
    const newId = await db.lists.add({ name: list.name, color: list.color, order: order++ });
    byName.set(list.name, newId);
    nameMap.set(list.name, newId);
    if (list.id !== undefined) idMap.set(list.id, newId);
  }

  let mainId = byName.get("メイン");

  const entries = data.entries.map((entry) => {
    const { id: _id, list: legacyList, ...rest } = entry as Entry & { list?: string };
    const listId =
      (rest.listId !== undefined ? idMap.get(rest.listId) : undefined) ??
      (legacyList ? (nameMap.get(legacyList) ?? byName.get(legacyList)) : undefined);
    const tags = rest.tags?.length ? rest.tags.map(normalizeTag) : extractTags(rest.note);
    return { ...rest, listId, tags };
  });

  if (entries.some((entry) => entry.listId === undefined) && mainId === undefined) {
    mainId = await db.lists.add({ name: "メイン", order: order++ });
    byName.set("メイン", mainId);
  }
  for (const entry of entries) {
    entry.listId ??= mainId;
  }

  if (entries.length > 0) {
    await db.entries.bulkAdd(entries);
  }
}

export async function deleteAll(): Promise<void> {
  await Promise.all([db.entries.clear(), db.lists.clear()]);
}
