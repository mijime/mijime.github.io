import { db } from "./db";
import type { MindNode } from "./types";

function arrayToRecord(arr: MindNode[]): Record<string, MindNode> {
  const rec: Record<string, MindNode> = {};
  for (const n of arr) {
    rec[n.id] = { ...n, vx: 0, vy: 0 };
  }
  return rec;
}

export async function loadFromDexie(): Promise<Record<string, MindNode> | null> {
  const all = await db.nodes.toArray();
  if (all.length === 0) return null;
  return arrayToRecord(all);
}

export async function saveToDexie(nodes: Record<string, MindNode>): Promise<void> {
  await db.nodes.clear();
  await db.nodes.bulkPut(Object.values(nodes));
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const entry = await db.meta.get(key);
  return entry?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
