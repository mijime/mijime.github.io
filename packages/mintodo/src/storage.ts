import { db } from "./db";
import type { MindNode, SaveData } from "./types";

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

export function downloadJson(data: SaveData, filename: string): string {
  const json = JSON.stringify(data, undefined, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  if (typeof document !== "undefined") {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }
  return url;
}

export function parseImportedJson(text: string): SaveData | null {
  try {
    const obj: unknown = JSON.parse(text);
    if (typeof obj !== "object" || obj === null) return null;
    const data = obj as Partial<SaveData>;
    if (data.version !== 1) return null;
    if (!Array.isArray(data.nodes)) return null;
    const nodes: MindNode[] = data.nodes.map((n) => Object.assign({}, n, { vx: 0, vy: 0 }));
    return { version: 1, nodes };
  } catch {
    return null;
  }
}
