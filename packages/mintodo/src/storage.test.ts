import { afterEach, beforeEach, beforeAll, describe, expect, it } from "bun:test";

// Use dynamic imports to ensure fake-indexeddb polyfills globalThis.indexedDB
// before Dexie module is evaluated (which captures indexedDB at module load time)
let db: Awaited<ReturnType<typeof import("./db")>>["db"];
let loadFromDexie: Awaited<ReturnType<typeof import("./storage")>>["loadFromDexie"];
let saveToDexie: Awaited<ReturnType<typeof import("./storage")>>["saveToDexie"];
let createInitialNodes: Awaited<ReturnType<typeof import("./store")>>["createInitialNodes"];

beforeAll(async () => {
  await import("fake-indexeddb/auto");
  const dbMod = await import("./db");
  db = dbMod.db;
  const storageMod = await import("./storage");
  loadFromDexie = storageMod.loadFromDexie;
  saveToDexie = storageMod.saveToDexie;
  const storeMod = await import("./store");
  createInitialNodes = storeMod.createInitialNodes;
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
