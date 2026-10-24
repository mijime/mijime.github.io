import { useEffect, useReducer, useRef } from "react";
import { reduce } from "./engine/reducer";
import { createGame } from "./engine/setup";
import type { GameState } from "./engine/types";

const STORAGE_KEY = "flowdeck:save:v18";
const DB_NAME = "flowdeck";
const DB_VERSION = 1;
const STORE_NAME = "saves";
const SAVE_KEY = "current";

function isGameState(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<GameState>;
  return (
    state.version === 18 &&
    typeof state.day === "number" &&
    typeof state.teamScore === "number" &&
    typeof state.teamDebt === "number" &&
    Array.isArray(state.players) &&
    state.players.length >= 4 &&
    state.players.length <= 6 &&
    Array.isArray(state.tasks) &&
    Array.isArray(state.taskDefs) &&
    Array.isArray(state.log) &&
    (state.phase === "human" ||
      state.phase === "ai" ||
      state.phase === "roundEnd" ||
      state.phase === "over")
  );
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage が使えない・容量超過の場合は IndexedDB に任せる
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => resolve(null));
  });
}

export async function loadGameAsync(): Promise<GameState | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(SAVE_KEY);
      request.addEventListener("success", () => {
        db.close();
        resolve(isGameState(request.result) ? request.result : null);
      });
      request.addEventListener("error", () => {
        db.close();
        resolve(null);
      });
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function saveGameAsync(state: GameState): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(state, SAVE_KEY);
    transaction.addEventListener("complete", () => db.close());
    transaction.addEventListener("error", () => db.close());
  } catch {
    db.close();
  }
}

export function newSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

export function useGame() {
  const initial = useRef<GameState | null | undefined>(undefined);
  if (initial.current === undefined) {
    initial.current = loadGame();
  }
  const hadLocalSave = useRef(initial.current !== null);
  const [state, dispatch] = useReducer(reduce, undefined, () => initial.current ?? createGame());

  useEffect(() => {
    if (hadLocalSave.current) return;
    let cancelled = false;
    void loadGameAsync().then((saved) => {
      if (!cancelled && saved) dispatch({ type: "HYDRATE", state: saved });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveGame(state);
    const timer = setTimeout(() => {
      void saveGameAsync(state);
    }, 150);
    return () => clearTimeout(timer);
  }, [state]);

  return { state, dispatch };
}
