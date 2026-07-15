import Dexie, { type Table } from "dexie"
import type { Entry } from "./types"

export interface ListDef {
  id?: number
  name: string
  color?: string
  order: number
}

const db = new Dexie("emolog") as Dexie & {
  entries: Table<Entry, number>
  lists: Table<ListDef, number>
}

db.version(1).stores({
  entries: "++id, date, timestamp",
})

db.version(2).stores({
  entries: "++id, date, timestamp, list",
  lists: "++id, name",
})

db.version(3).stores({
  entries: "++id, date, timestamp, list",
  lists: "++id, name, order",
})

// ── Entries ──

export async function getEntries(
  date: string,
  list?: string,
): Promise<Entry[]> {
  let collection = db.entries.where("date").equals(date)
  if (list) {
    collection = collection.filter(
      (e) => e.list === list || (!e.list && list === "メイン"),
    )
  }
  return collection.sortBy("timestamp")
}

export async function getEntriesByDateRange(
  from: string,
  to: string,
  list?: string,
): Promise<Entry[]> {
  let collection = db.entries
    .where("date")
    .between(from, to, true, true)
  if (list) {
    collection = collection.filter(
      (e) => e.list === list || (!e.list && list === "メイン"),
    )
  }
  return collection.sortBy("timestamp")
}

export async function addEntry(
  entry: Omit<Entry, "id">,
): Promise<number> {
  return db.entries.add(entry)
}

export async function deleteEntry(id: number): Promise<void> {
  return db.entries.delete(id)
}

export async function updateEntryNote(
  id: number,
  note: string,
): Promise<number> {
  return db.entries.update(id, { note: note || undefined })
}

// ── Lists ──

export async function getLists(): Promise<ListDef[]> {
  return db.lists.orderBy("order").toArray()
}

export async function addList(name: string): Promise<number> {
  const count = await db.lists.count()
  return db.lists.add({ name, order: count })
}

export async function renameList(
  oldName: string,
  newName: string,
): Promise<void> {
  await db.lists.where("name").equals(oldName).modify({ name: newName })
  await db.entries
    .where("list")
    .equals(oldName)
    .modify({ list: newName })
}

export async function removeList(name: string): Promise<void> {
  await db.lists.where("name").equals(name).delete()
  // Remove list reference from entries, they become "unlisted"
  await db.entries
    .where("list")
    .equals(name)
    .modify({ list: undefined })
}

export async function ensureDefaultList(): Promise<string> {
  const lists = await db.lists.toArray()
  if (lists.length === 0) {
    await db.lists.add({ name: "メイン", order: 0 })
    return "メイン"
  }
  return lists[0].name
}
