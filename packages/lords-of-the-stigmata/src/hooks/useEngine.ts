import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, getEngine } from "../store.ts";
import type { Engine } from "../types.ts";

export function useEngine(): Engine {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getEngine();
}
