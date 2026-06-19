/* eslint-disable init-declarations */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { downloadJson, loadFromDexie, parseImportedJson, saveToDexie } from "./storage";
import { createInitialNodes } from "./store";
import type { SaveData } from "./types";

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
    expect(url).toMatch(/^blob:/u);
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
