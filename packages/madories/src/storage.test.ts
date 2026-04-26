import { beforeEach, describe, expect, it } from "bun:test";
import { loadFromStorage, saveToStorage } from "./storage";
import { createBuilding } from "./store";

const store: Record<string, string> = {};
const mockLocalStorage = {
  clear: () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
  getItem: (key: string) => store[key] ?? undefined,
  key: (index: number) => Object.keys(store)[index] ?? undefined,
  get length() {
    return Object.keys(store).length;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
};

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: mockLocalStorage,
    writable: true,
  });
});

describe("saveToStorage / loadFromStorage", () => {
  it("round-trips building data", () => {
    const building = createBuilding();
    const activeFloorId = building.floors[0].id;
    saveToStorage(building, activeFloorId);
    const result = loadFromStorage();
    expect(result).not.toBeNull();
    expect(result?.building.floors[0].id).toBe(activeFloorId);
    expect(result?.activeFloorId).toBe(activeFloorId);
  });

  it("returns null when nothing saved", () => {
    expect(loadFromStorage()).toBeNull();
  });

  it("returns null on corrupt data", () => {
    localStorage.setItem("madories_plan", "not-json{{{");
    expect(loadFromStorage()).toBeNull();
  });
});
