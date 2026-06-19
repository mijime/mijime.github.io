import { afterEach, beforeEach, beforeAll, describe, expect, it } from "bun:test";
import type { SaveData } from "./types";

import "fake-indexeddb/auto";
// Use typeof import(...) in type positions to get the types of exports from modules without
// Triggering runtime evaluation. This is purely static analysis and avoids both:
//   1. The invalid Awaited<ReturnType<typeof import("./db")>>["db"] pattern (TS2344)
//   2. Runtime module loading that would capture globalThis.indexedDB before fake-indexeddb runs
type DbModule = typeof import("./db");
type StorageModule = typeof import("./storage");
type StoreModule = typeof import("./store");

let db: DbModule["db"];
let loadFromDexie: StorageModule["loadFromDexie"];
let saveToDexie: StorageModule["saveToDexie"];
let downloadJson: StorageModule["downloadJson"];
let parseImportedJson: StorageModule["parseImportedJson"];
let createInitialNodes: StoreModule["createInitialNodes"];

beforeAll(async () => {
  // Use dynamic imports at runtime to ensure fake-indexeddb polyfills globalThis.indexedDB
  // Before Dexie module is evaluated (which captures indexedDB at module load time).
  // The type aliases above are purely static and do NOT trigger runtime module evaluation.
  // @ts-expect-error - fake-indexeddb/auto has package.json exports issues
  await import("fake-indexeddb/auto");
  const dbMod = await import("./db");
  ({ db } = dbMod);
  const storageMod = await import("./storage");
  ({ loadFromDexie } = storageMod);
  ({ saveToDexie } = storageMod);
  ({ downloadJson } = storageMod);
  ({ parseImportedJson } = storageMod);
  const storeMod = await import("./store");
  ({ createInitialNodes } = storeMod);
});

beforeEach(async () => {
  await db.nodes.clear();
  await db.meta.clear();
});

afterEach(async () => {
  await db.nodes.clear();
  await db.meta.clear();
});

describe("saveToDexie / loadFromDexie", () => {
  it("round-trips nodes", async () => {
    const nodes = createInitialNodes();
    await saveToDexie(nodes);
    const loaded = await loadFromDexie();
    expect(loaded).not.toBeNull();
    expect(loaded!["root"].id).toBe("root");
    expect(Object.keys(loaded!).length).toBe(Object.keys(nodes).length);
  });

  it("returns null when empty", async () => {
    const loaded = await loadFromDexie();
    expect(loaded).toBeNull();
  });

  it("zeros vx, vy on load", async () => {
    const nodes = createInitialNodes();
    nodes["root"].vx = 5;
    nodes["root"].vy = -3;
    await saveToDexie(nodes);
    const loaded = await loadFromDexie();
    expect(loaded!["root"].vx).toBe(0);
    expect(loaded!["root"].vy).toBe(0);
  });
});

describe("JSON import / export", () => {
  it("downloadJson produces a Blob URL", () => {
    const data: SaveData = { version: 1, nodes: [] };
    const url = downloadJson(data, "test.json");
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url);
  });

  it("parseImportedJson reads valid data", () => {
    const data: SaveData = {
      version: 1,
      nodes: [{ ...createInitialNodes().root, vx: 0, vy: 0 }],
    };
    const json = JSON.stringify(data);
    const parsed = parseImportedJson(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.nodes.length).toBe(1);
  });

  it("parseImportedJson returns null on invalid data", () => {
    expect(parseImportedJson("not json")).toBeNull();
    expect(parseImportedJson("{}")).toBeNull();
    expect(parseImportedJson(JSON.stringify({ version: 2, nodes: [] }))).toBeNull();
  });
});
