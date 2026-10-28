import { useEffect, useReducer, useRef } from "react";
import { normalizeAnalytics } from "./engine/analytics/state";
import { DEFAULT_GENERATION_SWING } from "./engine/rules/generation";
import { reduce } from "./engine/reducer";
import { createGame } from "./engine/setup";
import type { Action, GameState } from "./engine/types";

const STORAGE_KEY = "flowdeck:save:v28";
const LEGACY_STORAGE_KEYS = ["flowdeck:save:v27", "flowdeck:save:v26"];
const DB_NAME = "flowdeck";
const DB_VERSION = 1;
const STORE_NAME = "saves";
const SAVE_KEY = "current";

function isGameState(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<GameState>;
  return (
    (state.version === 28 || state.version === 27 || state.version === 26) &&
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

/** v26/v27セーブに analytics・lanes・aiProfile を補ってv28として返す。 */
export function normalizeState(state: GameState): GameState {
  const next = state as GameState;
  next.version = 28;
  next.generationSwing ??= DEFAULT_GENERATION_SWING;
  if (next.aiProfile !== "standard") next.aiProfile = "standard";
  next.analytics = normalizeAnalytics(next.analytics);
  next.teamRelics ??= [];
  next.pendingRelic ??= null;
  for (const player of next.players) {
    player.weights.prudence ??= 0;
    player.weights.solidarity ??= 0;
    player.weights.appetite ??= 0;
  }
  for (const player of next.outcome?.perPlayer ?? []) {
    player.weights.prudence ??= 0;
    player.weights.solidarity ??= 0;
    player.weights.appetite ??= 0;
  }
  next.metrics = (next.metrics ?? []).map((snapshot) => {
    snapshot.lanes ??= { open: 0, inbox: 0, wip: 0, test: 0, done: 0 };
    snapshot.perPlayer ??= [];
    return snapshot;
  });
  return next;
}

export function loadGame(): GameState | null {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (isGameState(parsed)) return normalizeState(parsed);
    }
    return null;
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
        const saved = request.result;
        resolve(isGameState(saved) ? normalizeState(saved) : null);
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
  const [state, dispatch] = useReducer(
    (current: GameState, action: Action) => reduce(current, action),
    undefined,
    () => initial.current ?? createGame(),
  );

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
